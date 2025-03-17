// File: app/api/speechToText/route.ts
import { exec } from 'child_process';
import fs from 'fs';
import { NextResponse } from "next/server";
import util from 'util';
import axios from 'axios';
import { tmpdir } from 'os';
import path from 'path';
import { usePatientDataStore } from "@/store/patientDataStore";

interface IRequest {
  audio: string;
}

const execAsync = util.promisify(exec);

export async function POST(request: Request): Promise<NextResponse> {
  const req: IRequest = await request.json();
  console.log("Received request");
  const base64Audio: string = req.audio;
  const audio = Buffer.from(base64Audio, 'base64');

  try {
    const detectedLanguage: string = await detectLanguage(audio);
    console.log(`detectedLanguage: ${detectedLanguage}`);
    // Update the persistent store with the detected language.
    usePatientDataStore.setState({ languageSpoken: detectedLanguage });
    return NextResponse.json({ result: detectedLanguage }, { status: 200 });
  } catch (error: any) {
    console.error("Error detected:", error);
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return NextResponse.json({ error: error.response.data }, { status: 500 });
    } else {
      console.error(`Error with API request: ${error.message}`);
      return NextResponse.json({ error: "An error occurred during your request." }, { status: 500 });
    }
  }
}

async function detectLanguage(audioData: Buffer): Promise<string> {
  // Write incoming audio to a temporary file (assumed WebM)...
  const inputPath = path.join(tmpdir(), "input.webm");
  // ...and convert it to WAV (required by GPT‑4o audio preview).
  const outputPath = path.join(tmpdir(), "output.wav");
  fs.writeFileSync(inputPath, new Uint8Array(audioData));
  try {
    await execAsync(`ffmpeg -y -i ${inputPath} ${outputPath}`);
  } catch (ffmpegError) {
    console.error("FFmpeg conversion error:", ffmpegError);
    throw new Error("Failed to convert audio format");
  }
  if (!fs.existsSync(outputPath)) {
    throw new Error("Output file was not created during conversion");
  }
  const wavBuffer = fs.readFileSync(outputPath);
  const wavBase64 = wavBuffer.toString("base64");

  // Build a strict prompt for language detection.
  const systemPrompt =
    "You are a language detection engine. Given the following audio input, determine the ISO language code of the spoken language. Return only a JSON object with a single field \"language\" (for example, {\"language\": \"en\"}). Do not include any additional text.";

  const payload = {
    model: "gpt-4o-audio-preview",
    modalities: ["text"],  // output only text
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "input_audio",
            input_audio: {
              data: wavBase64,
              format: "wav"
            }
          }
        ]
      }
    ]
  };

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    }
  );

  if (response.status === 200) {
    const message = response.data.choices[0].message;
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(message.content);
    } catch (err) {
      console.error("Error parsing GPT-4o response as JSON:", err);
      throw new Error("Could not parse GPT-4o response as JSON");
    }
    const detectedLanguage: string = jsonResponse.language;
    // Clean up temporary files.
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.error("Error cleaning up temporary files:", cleanupError);
    }
    return detectedLanguage;
  } else {
    throw new Error("Error from GPT-4o audio API");
  }
}