// src/store/elementsStore.ts
import { create } from "zustand";
import { AgentConfig, SessionStatus } from "@/app/types";
import { RefObject, createRef } from "react";

// Define a type for email status
export type EmailStatus = 'idle' | 'sending' | 'done';

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
  
  // TranslationsPage flags
  showTranslationsPage: boolean;
  setShowTranslationsPage: (show: boolean) => void;
  theUserIsSpeaking: boolean;
  setTheUserIsSpeaking: (speaking: boolean) => void;
  assistantVoiceFinished: boolean;
  setAssistantVoiceFinished: (finished: boolean) => void;
  micMuted: boolean;
  setMicMuted: (muted: boolean) => void;
  
  // Surgery info state
  surgeryInfoNeeded: RefObject<boolean | null>;
  setSurgeryInfoNeeded: (needed: boolean) => void;
  
  // Surgical page state
  loadSurgicalPage: boolean;
  setLoadSurgicalPage: (load: boolean) => void;
  
  // Email status state
  sendEmailStatus: EmailStatus;
  setSendEmailStatus: (status: EmailStatus) => void;
  
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
  setSelectedAgentName: (name) => { 
    //console.log("SelectedAgentName", name);
    set({ selectedAgentName: name })},
    
  setSelectedAgentConfigSet: (configSet) => set({ selectedAgentConfigSet: configSet }),
  
  // Connection-related state
  dataChannel: null,
  sessionStatus: "DISCONNECTED",
  setDataChannel: (dc) => set({ dataChannel: dc }),
  setSessionStatus: (status) => set({ sessionStatus: status }),
  
  // User input state
  userText: "",
  setUserText: (text) => set({ userText: text }),
  
  // TranslationsPage flags - defaults to false
  showTranslationsPage: false,
  setShowTranslationsPage: (show) => set({ showTranslationsPage: show }),
  theUserIsSpeaking: false,
  setTheUserIsSpeaking: (speaking) => {
    console.log("store: TheUserIsSpeaking", speaking);
    set({ theUserIsSpeaking: speaking })},
  assistantVoiceFinished: false,
  setAssistantVoiceFinished: (finished) => {
    console.log("store: AssistantVoiceFinished", finished);
    set({ assistantVoiceFinished: finished })},
  micMuted: false,
  setMicMuted: (muted) => {
    console.log("store: MicMuted", muted);
    set({ micMuted: muted })
  },
  
  // Surgery info state - defaults to false
  surgeryInfoNeeded: (() => {
    const ref = createRef<boolean | null>();
    ref.current = false; // Initialize with false
    return ref;
  })(),
  setSurgeryInfoNeeded: (needed) => {
    if (useElementsStore.getState().surgeryInfoNeeded.current !== needed) {
      useElementsStore.getState().surgeryInfoNeeded.current = needed;
    }
  },
  
  // Surgical page state - defaults to false
  loadSurgicalPage: false,
  setLoadSurgicalPage: (load) => set({ loadSurgicalPage: load }),
  
  // Email status state - defaults to 'idle'
  sendEmailStatus: 'idle',
  setSendEmailStatus: (status) => set({ sendEmailStatus: status }),
  
  // Refs (initialized once)
  pcRef: createRef<RTCPeerConnection | null>(),
  dcRef: createRef<RTCDataChannel | null>(),
  audioElementRef: createRef<HTMLAudioElement | null>(),
  micRef: createRef<MediaStream | null>(),
}))