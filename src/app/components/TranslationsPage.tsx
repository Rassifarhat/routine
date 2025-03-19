"use client";

import React, { useEffect, useRef, useState } from "react";
import { useElementsStore } from "@/store/elementsStore";
import { usePatientDataStore, LanguagesContext } from "@/store/patientDataStore";

// Common languages for medical translation
const AVAILABLE_LANGUAGES = [
  "English",
  "French",
  "Spanish",
  "German",
  "Arabic",
  "Chinese",
  "Russian",
  "Hindi"
];

interface TranslationPageProps {
  changeAgent: (agentName: string) => void;
}

export default function TranslationPage({ changeAgent }: TranslationPageProps) {
  // Import states from elementsStore using the hook pattern
  const theUserIsSpeaking = useElementsStore(state => state.theUserIsSpeaking);
  const assistantVoiceFinished = useElementsStore(state => state.assistantVoiceFinished);
  const selectedAgentName = useElementsStore(state => state.selectedAgentName);
  const micMuted = useElementsStore(state => state.micMuted);
  const setTheUserIsSpeaking = useElementsStore(state => state.setTheUserIsSpeaking);
  const setAssistantVoiceFinished = useElementsStore(state => state.setAssistantVoiceFinished);
  
  // Import states from patientDataStore
  const languagesContext = usePatientDataStore(state => state.languagesContext);
  const setLanguagesContext = usePatientDataStore(state => state.setLanguagesContext);
  
  // Local state for language selections
  const [doctorLanguage, setDoctorLanguage] = useState(languagesContext.doctorLanguage || "English");
  const [patientLanguage, setPatientLanguage] = useState(languagesContext.patientLanguage || "French");
  
  // Flag to track if we just updated languages to avoid infinite loops
  const [languagesJustUpdated, setLanguagesJustUpdated] = useState(false);
  
  // Create a ref to track if we're in the process of changing agents
  const changingAgentRef = useRef<boolean>(false);
  
  // Create a ref to track the current translator type
  const currentTranslatorRef = useRef("patientToDoctor");
  
  // Create a ref to track if the assistant just finished speaking to prevent re-entry
  const assistantJustFinishedRef = useRef<boolean>(false);
  



useEffect(() => {
  let cancelled = false;
  // Define states: "idle" (ready to record), "recording" (currently recording), "blocked" (recorded; waiting for silence)
  let currentState: "idle" | "recording" | "blocked" = "idle";
  let silenceStartTime: number | null = null;
  let animationFrameId: number;

  // Instead of calling getUserMedia again, use the shared mic stream
  const micStream = useElementsStore.getState().micRef.current;
  if (!micStream) {
    console.error("No mic stream available from realtime connection.");
    return;
  }

  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(micStream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const volumeThreshold = 15; // Adjust threshold as needed

  const startRecording = () => {
    const recorderOptions = { mimeType: 'audio/webm' };
    const mediaRecorder = new MediaRecorder(micStream, recorderOptions);
    const chunks: BlobPart[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        // Send the Base64 audio to your API
        fetch("/api/languageDetectorServer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64data })
        })
          .then(response => response.json())
          .then(data => console.log("Language detection response:", data))
          .catch(error => console.error("Error uploading audio:", error));
      };
      reader.readAsDataURL(blob);
      // After recording, block further recordings until silence is detected
      currentState = "blocked";
    };

    mediaRecorder.start();
    // Automatically stop recording after 2 seconds
    setTimeout(() => {
      if (mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    }, 2000);
  };

  const checkForSpeech = () => {
    if (cancelled) return;
    
    // Get the current micMuted state
    const micMuted = useElementsStore.getState().micMuted;
    
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += Math.abs(dataArray[i] - 128);
    }
    const avg = sum / dataArray.length;

    // Only process audio if the mic is not muted
    if (!micMuted) {
      if (currentState === "idle") {
        if (avg > volumeThreshold) {
          console.log("Page:Speech detected: starting 2-second recording.");
          currentState = "recording";
          startRecording();
        }
      } else if (currentState === "blocked") {
        // Wait for at least 1 second of silence before resetting state
        if (avg <= volumeThreshold) {
          if (silenceStartTime === null) {
            silenceStartTime = Date.now();
          } else if (Date.now() - silenceStartTime > 3000) {
            currentState = "idle";
            silenceStartTime = null;
          }
        } else {
          silenceStartTime = null;
        }
      }
    } else {
      // If mic is muted, we should reset to idle state when unmuted
      if (currentState !== "idle") {
        currentState = "idle";
        silenceStartTime = null;
      }
    }
    
    animationFrameId = requestAnimationFrame(checkForSpeech);
  };

  checkForSpeech();

  return () => {
    cancelled = true;
    cancelAnimationFrame(animationFrameId);
    audioContext.close();
    // Do not stop micStream here since it's shared with WebRTC
  };
}, []);

  // Effect to synchronize local language state with patientDataStore
  // This only updates the languages context without triggering agent changes
  useEffect(() => {
    // Skip if we're in the middle of a language update
    if (languagesJustUpdated) {
      setLanguagesJustUpdated(false);
      return;
    }
    
    setLanguagesContext({
      doctorLanguage,
      patientLanguage
    });
    
    // Manual one-time reload of the agent after language change
    // This pattern breaks the dependency loop
    const timeout = setTimeout(() => {
      changeAgent(currentTranslatorRef.current);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [doctorLanguage, patientLanguage]);
  


  // Effect to handle agent switching when user starts speaking
  useEffect(() => {
    // Only proceed if user is speaking and we're not already changing agents
    if (theUserIsSpeaking && !changingAgentRef.current) {
      assistantJustFinishedRef.current = false; 
      // Set changing agent flag to true to prevent recursive calls
      changingAgentRef.current = true;
      
      // Toggle the translator type
      if (currentTranslatorRef.current === "doctorToPatient") {
        currentTranslatorRef.current = "patientToDoctor";
      } else {
        currentTranslatorRef.current = "doctorToPatient";
      }
      
      // Call the changeAgent callback with the new agent name
      changeAgent(currentTranslatorRef.current);
    }
  }, [theUserIsSpeaking, changeAgent]);

  // Effect to reset the changing agent flag when assistant voice finishes and user is not speaking
  useEffect(() => {
    if (!theUserIsSpeaking && changingAgentRef.current) {
      changingAgentRef.current = false;
    }
  }, [theUserIsSpeaking]);
  
  // Handler for language changes
  const handleLanguageChange = (type: 'doctor' | 'patient', language: string) => {
    setLanguagesJustUpdated(true);
    if (type === 'doctor') {
      setDoctorLanguage(language);
    } else {
      setPatientLanguage(language);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Translation Assistant</h2>
      
      {/* Language selection UI */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Doctor Language
          </label>
          <select 
            className="w-full border border-gray-300 rounded-md py-2 px-3"
            value={doctorLanguage}
            onChange={(e) => handleLanguageChange('doctor', e.target.value)}
          >
            {AVAILABLE_LANGUAGES.map(lang => (
              <option key={`doctor-${lang}`} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient Language
          </label>
          <select 
            className="w-full border border-gray-300 rounded-md py-2 px-3"
            value={patientLanguage}
            onChange={(e) => handleLanguageChange('patient', e.target.value)}
          >
            {AVAILABLE_LANGUAGES.map(lang => (
              <option key={`patient-${lang}`} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>
      
      <p className="text-gray-700 mb-2">
        Current mode: {currentTranslatorRef.current === "patientToDoctor" 
          ? `${patientLanguage} → ${doctorLanguage}` 
          : `${doctorLanguage} → ${patientLanguage}`}
      </p>
      
      <div className="mt-4">
        <p className="text-sm text-gray-500">
          {theUserIsSpeaking ? "Listening..." : "Ready for translation"}
        </p>
        <p className="text-sm text-gray-500">
          {assistantVoiceFinished ? "Translation complete" : ""}
        </p>
        <p className="text-sm text-gray-500">
          Microphone status: {micMuted ? "Muted (during translation)" : "Active"}
        </p>
      </div>
    </div>
  );
}