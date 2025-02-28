"use client";

import { v4 as uuidv4 } from "uuid";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useSendClientEvent } from "./useSendClientEvent";

export function useSendSimulatedUserMessage() {
  const { addTranscriptMessage } = useTranscript();
  const sendClientEvent = useSendClientEvent();

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };
  return sendSimulatedUserMessage;
}
