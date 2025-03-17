// /api/scribe/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  console.log("Incoming POST request to /api/scribe");
  try {
    // Log the raw request details for debugging
    console.log("Request method:", req.method);
    console.log("Request headers:", [...req.headers.entries()]);

    // Parse the request body and log its content
    const bodyText = await req.text();
    console.log("Raw request body:", bodyText);

    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (jsonError) {
      console.error("Failed to parse request JSON:", jsonError);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    const { messages } = payload;
    console.log("Parsed messages:", messages);

    const systemPrompt = `
You assist in writing complex surgical reports. 
You act as an experienced orthopaedic surgeon. You write very detailed, thorough, and extensive surgical notes including operative notes and surgical notes according to the below plan. the different surgical notes should be written with subtitles and the subdivisions and NO initial identifiers (such as patient or doctor name). the operative note itself should not include subdivisions and subtitles. After the operative note is written, include:

1. Pathological and normal findings during surgery.
2. A postoperative physician note.
3. Pre-operative and post-operative orders for the floor nurses.
4. Extensive education for the patient including psychological support.
5. A brief history leading to the surgical decision.
6. A plan before surgery including measurable, actionable goals.
7. Admission and post-operation diagnosis.
8. Extensive hospital course summary.
9. Discharge physical examination.
10. Procedure summary.
11. Condition at discharge.
12. Health education and instructions at home.
13. A list of reasons to visit the hospital immediately after discharge.
the output should be in paragraphs with the subdivisions and the subtitles included. you will allow editing after the note is written and outputted.
    `;

    const stream = await streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages,
    });

    return stream.toDataStreamResponse();
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}