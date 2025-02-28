// src/store/elementsStore.ts
import { create } from "zustand";
import { AgentConfig, SessionStatus } from "@/app/types";
import { RefObject, createRef } from "react";

interface ElementsState {
  // Agent-related state
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  setSelectedAgentName: (name: string) => void;
  setSelectedAgentConfigSet: (configSet: AgentConfig[] | null) => void;
  
  // Connection-related state
  dataChannel: RTCDataChannel | null;
  sessionStatus: SessionStatus;
  setDataChannel: (dc: RTCDataChannel | null) => void;
  setSessionStatus: (status: SessionStatus) => void;
  
  // User input state
  userText: string;
  setUserText: (text: string) => void;
  
  // Refs
  pcRef: RefObject<RTCPeerConnection | null>;
  dcRef: RefObject<RTCDataChannel | null>;
  audioElementRef: RefObject<HTMLAudioElement | null>;
  micRef: RefObject<MediaStream | null>;
}

export const useElementsStore = create<ElementsState>((set) => ({
  // Agent-related state
  selectedAgentName: "",
  selectedAgentConfigSet: null,
  setSelectedAgentName: (name) => set({ selectedAgentName: name }),
  setSelectedAgentConfigSet: (configSet) => set({ selectedAgentConfigSet: configSet }),
  
  // Connection-related state
  dataChannel: null,
  sessionStatus: "DISCONNECTED",
  setDataChannel: (dc) => set({ dataChannel: dc }),
  setSessionStatus: (status) => set({ sessionStatus: status }),
  
  // User input state
  userText: "",
  setUserText: (text) => set({ userText: text }),
  
  // Refs (initialized once)
  pcRef: createRef<RTCPeerConnection | null>(),
  dcRef: createRef<RTCDataChannel | null>(),
  audioElementRef: createRef<HTMLAudioElement | null>(),
  micRef: createRef<MediaStream | null>(),
}));