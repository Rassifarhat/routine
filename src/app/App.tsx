"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";

// UI components
import Eih from "./components/Eih";
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import SurgeryInfoNeeded from "./components/SurgeryInfoNeeded";
import BottomToolbar from "./components/BottomToolbar";
import SurgicalScribePage from "./components/surgicalScribePage";
import TranslationsPage from "./components/TranslationsPage";

// Types
import { AgentConfig, SessionStatus } from "@/app/types";

// Context providers & hooks
import { useConnection } from "./hooks/useConnection";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";
import { useSendClientEvent } from "./hooks/useSendClientEvent";
import { useSendSimulatedUserMessage } from "./hooks/useSendSimulatedUserMessage";
import { useUpdateSession } from "./hooks/useUpdateSession";
import { useSendEmail } from "./hooks/useSendEmail";
import { useCancelAssistantSpeech } from "./hooks/useCancelAssistantSpeech";
import { useHandleSendTextMessage } from "./hooks/useHandleSendTextMessage";
import { usePersistentState } from "./hooks/usePersistentState";
// Import our new audio output monitor hook
import { useOutputMonitor } from "@/app/hooks/useOutputMonitor";

// Utilities
import { createRealtimeConnection } from "./lib/realtimeConnection";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { useElementsStore } from "@/store/elementsStore";

function App() {
  const searchParams = useSearchParams();
  const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } =
    useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();
  const [initialGreetingSent, setInitialGreetingSent] = useState(false);
  const { 
    sessionStatus, setSessionStatus, 
    pcRef, dcRef, dataChannel, setDataChannel, 
    audioElementRef, selectedAgentName, setSelectedAgentName, 
    selectedAgentConfigSet, setSelectedAgentConfigSet, 
    userText, setUserText, surgeryInfoNeeded,
    loadSurgicalPage, showTranslationsPage,
    micRef, micMuted, setMicMuted
  } = useElementsStore();

  // State to track the microphone stream
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const audioConnectionRef = useRef<{
    audioContext: AudioContext | null;
    connected: boolean;
  }>({
    audioContext: null,
    connected: false
  });

  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isPTTActive, setIsPTTActive] = usePersistentState("pushToTalkUI", false);
  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = usePersistentState("logsExpanded", true);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = usePersistentState("audioPlaybackEnabled", true);

  const handleServerEventRef = useHandleServerEvent();
  const sendClientEvent = useSendClientEvent();
  const { connectToRealtime, disconnectFromRealtime } = useConnection();
  const sendSimulatedUserMessage = useSendSimulatedUserMessage();
  const updateSession = useUpdateSession();
  const cancelAssistantSpeech = useCancelAssistantSpeech();
  const handleSendTextMessage = useHandleSendTextMessage();

  // Initialize microphone and store it.
  const initializeMicrophone = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      micRef.current = stream;
      return stream;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      return null;
    }
  };

  // Control microphone tracks based on micMuted flag.
  useEffect(() => {
    if (!micStream) return;
    console.log(`Setting microphone ${micMuted ? 'muted' : 'unmuted'}`);
    micStream.getAudioTracks().forEach(track => {
      track.enabled = !micMuted;
    });
  }, [micMuted, micStream]);

  // Import the new output monitor hook to update micMuted based on playback volume.
  useOutputMonitor(audioElementRef.current, setMicMuted);

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }
    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";
    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    const setupConnection = async () => {
      if (selectedAgentName && sessionStatus === "DISCONNECTED") {
        const stream = await initializeMicrophone();
        if (stream) {
          connectToRealtime(isAudioPlaybackEnabled, handleServerEventRef, stream);
        } else {
          console.error("Failed to initialize microphone");
        }
      }
    };
    setupConnection();
  }, [selectedAgentName]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      if (!initialGreetingSent) {
        updateSession(true, isPTTActive);
        setInitialGreetingSent(true);
      } else {
        updateSession(true, isPTTActive);
      }
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  const changeAgent = (agentName: string) => {
    setSelectedAgentName(agentName);
  };

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      console.log(
        `updatingSession, isPTTActive=${isPTTActive} sessionStatus=${sessionStatus}`
      );
      updateSession(false, isPTTActive);
    }
  }, [isPTTActive]);

  const handleTalkButtonDown = () => {
    if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open")
      return;
    cancelAssistantSpeech();
    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: "input_audio_buffer.clear" }, "clear PTT buffer");
  };

  const handleTalkButtonUp = () => {
    if (
      sessionStatus !== "CONNECTED" ||
      dataChannel?.readyState !== "open" ||
      !isPTTUserSpeaking
    )
      return;
    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: "input_audio_buffer.commit" }, "commit PTT");
    sendClientEvent({ type: "response.create" }, "trigger response PTT");
  };

  const onToggleConnection = async () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        setMicStream(null);
        micRef.current = null;
      }
      setIsPTTUserSpeaking(false);
      setSessionStatus("DISCONNECTED");
    } else {
      const stream = await initializeMicrophone();
      if (stream) {
        connectToRealtime(isAudioPlaybackEnabled, handleServerEventRef, stream);
      } else {
        console.error("Failed to initialize microphone");
      }
    }
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentConfig = e.target.value;
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", newAgentConfig);
    window.location.replace(url.toString());
  };

  const handleSelectedAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentName = e.target.value;
    setSelectedAgentName(newAgentName);
  };

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaybackEnabled]);

  const agentSetKey = searchParams.get("agentConfig") || "default";

  return (
    <div className="text-base flex flex-col h-screen text-gray-800 relative rounded-md">
      <div className="p-5 text-lg font-semibold flex justify-between items-center">
        <div className="flex items-center">
          <div onClick={() => window.location.reload()} style={{ cursor: 'pointer' }}>
            <Image
              src="/openai-logomark.svg"
              alt="OpenAI Logo"
              width={30}
              height={30}
              className="mr-2"
            />
          </div>
          <div className="flex items-center">
            <div className="text-black ">
              Emirates International Hospital <span className="text-red-900">digital twin</span>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <label className="flex items-center text-base gap-1 mr-2 font-medium">
            ExpertiseDomain
          </label>
          <div className="relative inline-block">
            <select
              value={agentSetKey}
              onChange={handleAgentChange}
              className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
            >
              {Object.keys(allAgentSets).map((agentKey) => (
                <option key={agentKey} value={agentKey}>
                  {agentKey}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
          {agentSetKey && (
            <div className="flex items-center ml-6">
              <label className="flex items-center text-base gap-1 mr-2 font-medium">
                currentHelper
              </label>
              <div className="text-sm font-medium px-2 py-1 bg-gray-100 rounded">
                {selectedAgentName}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-1 gap-2 px-2 overflow-hidden relative">
        <Eih />
        {loadSurgicalPage ? (
          <SurgicalScribePage />
        ) : surgeryInfoNeeded?.current ? (
          <SurgeryInfoNeeded />
        ) : showTranslationsPage ? (
          <TranslationsPage changeAgent={changeAgent} />
        ) : (
          <Events isExpanded={isEventsPaneExpanded} />
        )}
      </div>
      <BottomToolbar
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
      />
    </div>
  );
}

export default App;