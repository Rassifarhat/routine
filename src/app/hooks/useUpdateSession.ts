"use client";

import { useElementsStore } from "@/store/elementsStore";
import { useSendClientEvent } from "./useSendClientEvent";
import { useSendSimulatedUserMessage } from "./useSendSimulatedUserMessage";
import languageDetector from "../agentConfigs/doctorDtwin/languageDetector";

export function useUpdateSession() {
  const { selectedAgentName, selectedAgentConfigSet } = useElementsStore();
  const sendClientEvent = useSendClientEvent();
  const sendSimulatedUserMessage = useSendSimulatedUserMessage();

  const updateSession = (shouldTriggerResponse: boolean = false, isPTTActive: boolean) => {
    // Get the current agent name
    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );
    
    // Only clear the audio buffer if the current agent is not doctorToPatient or patientToDoctor
    if (currentAgent?.name !== "doctorToPatient" && currentAgent?.name !== "patientToDoctor") {
      sendClientEvent(
        { type: "input_audio_buffer.clear" },
        "clear audio buffer on session update"
      );
    }

    let sessionUpdateEvent: any;
// if currentagent is languageDetector, set shouldTriggerResponse to false
if (currentAgent?.name === "patientToDoctor" || currentAgent?.name === "doctorToPatient") {
  shouldTriggerResponse = true;
  const turnDetection = isPTTActive
  ? null
  : {
      type: "server_vad",
      threshold: 0.6,
      prefix_padding_ms: 300,
      silence_duration_ms: 1000,
      create_response: true,
    };

const instructions = currentAgent?.instructions || "";
const tools = currentAgent?.tools || [];

sessionUpdateEvent = {
  type: "session.update",
  session: {
    modalities: ["text", "audio"],
    instructions,
    input_audio_format: "pcm16",
    output_audio_format: "pcm16",
    input_audio_transcription: { model: "whisper-1" },
    turn_detection: turnDetection,
    tools,
  },
}; 
} else{

    const turnDetection = isPTTActive
      ? null
      : {
          type: "server_vad",
          threshold: 0.6,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
          create_response: true,
        };

    const instructions = currentAgent?.instructions || "";
    const tools = currentAgent?.tools || [];

    sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "sage",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
      },
    };
  };


    sendClientEvent(sessionUpdateEvent);

    if (shouldTriggerResponse && currentAgent?.name !== "doctorToPatient" && currentAgent?.name !== "patientToDoctor") {
      sendSimulatedUserMessage("hello assistant");
    }
  };

  return updateSession;
}
