"use client";

import { useElementsStore } from "@/store/elementsStore";
import { useEvent } from "@/app/contexts/EventContext";

export function useSendClientEvent() {
  const { dcRef } = useElementsStore();
  const { logClientEvent } = useEvent();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      console.error(
        "Failed to send message - no data channel available",
        eventObj
      );
    }
  };

  return sendClientEvent;
}
