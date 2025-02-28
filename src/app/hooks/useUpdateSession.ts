"use client";

import { useElements } from "@/app/contexts/ElementsContext";
import { useSendClientEvent } from "./useSendClientEvent";
import { useSendSimulatedUserMessage } from "./useSendSimulatedUserMessage";

export function useUpdateSession() {
  const { selectedAgentName, selectedAgentConfigSet } = useElements();
  const sendClientEvent = useSendClientEvent();
  const sendSimulatedUserMessage = useSendSimulatedUserMessage();

  const updateSession = (shouldTriggerResponse: boolean = false, isPTTActive: boolean) => {
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

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

    const sessionUpdateEvent = {
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

    sendClientEvent(sessionUpdateEvent);

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage("hello assistant");
    }
  };

  return updateSession;
}
