// src/app/hooks/useConnection.ts
"use client";

import { useEvent } from "@/app/contexts/EventContext";
import { useElementsStore } from "@/store/elementsStore";
import { createRealtimeConnection } from "@/app/lib/realtimeConnection";
import { RefObject } from "react";

export function useConnection() {
  const { logClientEvent, logServerEvent } = useEvent();
  const { 
    setSessionStatus, 
    pcRef, 
    dcRef, 
    audioElementRef,
    setDataChannel,
    sessionStatus
  } = useElementsStore();

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async (
    isAudioPlaybackEnabled: boolean,
    handleServerEventRef: RefObject<(event: any) => void>,
    micStream: MediaStream
  ) => {
    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return;
      }

      // Initialize audio element if needed
      if (!audioElementRef.current) {
        const audioEl = document.createElement("audio");
        audioEl.id = "realtime-audio";
        audioEl.style.display = "none"; // hide it from the UI
        document.body.appendChild(audioEl);
        audioElementRef.current = audioEl;
      }
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;

      // Create the connection with the provided microphone stream
      const { pc, dc } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef,
        micStream
      );
      pcRef.current = pc;
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        logClientEvent({}, "data_channel.open");
      });
      dc.addEventListener("close", () => {
        logClientEvent({}, "data_channel.close");
      });
      dc.addEventListener("error", (err: any) => {
        logClientEvent({ error: err }, "data_channel.error");
      });
      dc.addEventListener("message", (e: MessageEvent) => {
        if (handleServerEventRef.current) {
          handleServerEventRef.current(JSON.parse(e.data));
        }
      });

      setDataChannel(dc);
    } catch (err) {
      console.error("Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    // Clean up WebRTC connection
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");
    
    logClientEvent({}, "disconnected");
  };

  return {
    connectToRealtime,
    disconnectFromRealtime
  };
}