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
  
  // Effect to synchronize local language state with patientDataStore
  // This only updates the languages context without triggering agent changes
  useEffect(() => {
    // Skip if we're in the middle of a language update
    if (languagesJustUpdated) {
      setLanguagesJustUpdated(false);
      return;
    }
    
    console.log(`TranslationsPage: Updating language context - Patient: ${patientLanguage}, Doctor: ${doctorLanguage}`);
    setLanguagesContext({
      doctorLanguage,
      patientLanguage
    });
    
    // Manual one-time reload of the agent after language change
    // This pattern breaks the dependency loop
    const timeout = setTimeout(() => {
      console.log("TranslationsPage: Reloading agent after language change");
      changeAgent(currentTranslatorRef.current);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [doctorLanguage, patientLanguage]);
  
  useEffect(() => {
    console.log(`debuggingTranslationPage: the user speaking: ${theUserIsSpeaking}, changingagentref: ${changingAgentRef.current}`);
  }, [theUserIsSpeaking, changingAgentRef.current]);

  // Effect to handle agent switching when user starts speaking
  useEffect(() => {
    // Only proceed if user is speaking and we're not already changing agents
    if (theUserIsSpeaking && !changingAgentRef.current) {
      console.log("TranslationPage: picking translator");
      assistantJustFinishedRef.current = false; 
      // Set changing agent flag to true to prevent recursive calls
      changingAgentRef.current = true;
      
      // Toggle the translator type
      if (currentTranslatorRef.current === "doctorToPatient") {
        console.log("TranslationPage: switching to doctor--> patient");
        currentTranslatorRef.current = "patientToDoctor";
      } else {
        console.log("TranslationPage: switching to patient--> doctor");
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
      console.log("TranslationPage: second useeffect entered")
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
      </div>
    </div>
  );
}