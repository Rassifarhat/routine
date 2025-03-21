"use client";

import { useSendClientEvent } from "./useSendClientEvent";
import { useCancelAssistantSpeech } from "./useCancelAssistantSpeech";
import { useElementsStore } from "@/store/elementsStore";

export function useHandleSendTextMessage() {
  const sendClientEvent = useSendClientEvent();
  const cancelAssistantSpeech = useCancelAssistantSpeech();
  const { userText, setUserText } = useElementsStore();

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    cancelAssistantSpeech();

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: userText.trim() }],
        },
      },
      "(send user text message)"
    );
    setUserText("");

    sendClientEvent({ type: "response.create" }, "trigger response");
  };

  return handleSendTextMessage;
}
