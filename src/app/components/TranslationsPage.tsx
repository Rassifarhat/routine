"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePatientDataStore } from '@/store/patientDataStore';
import { useTranscript } from '../contexts/TranscriptContext';
import { TranscriptItem } from '@/app/types';
import ReactMarkdown from 'react-markdown';
import { useElements } from '@/app/contexts/ElementsContext';
import { useSendSimulatedUserMessage } from '../hooks/useSendSimulatedUserMessage';

interface TranslationsPageProps {
  onAgentChange: (agentName: string) => void;
}


const TranslationsPage: React.FC<TranslationsPageProps> = ({ onAgentChange }) => {
  const { transcriptItems } = useTranscript();
  const { languageSpoken, languagesContext, setTranslationText, translationText } = usePatientDataStore();
  const [translationLanguage, setTranslationLanguage] = useState("");
  const [lastUserMessage, setLastUserMessage] = useState<TranscriptItem | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const { setSelectedAgentName } = useElements();
  const sendSimulatedUserMessage = useSendSimulatedUserMessage();
  const [lastAssistantMessage, setLastAssistantMessage] = useState<TranscriptItem | null>(null);
  const { selectedAgentName: currentAgentName } = useElements();
  const assistantHandledRef = useRef<string | null>(null);

  // Set translation language based on the spoken language.
  useEffect(() => {
    if (languageSpoken === languagesContext.patientLanguage) {
      setTranslationLanguage(languagesContext.doctorLanguage);
    } else if (languageSpoken === languagesContext.doctorLanguage) {
      setTranslationLanguage(languagesContext.patientLanguage);
    } else {
      setTranslationLanguage('');
    }
  }, [languageSpoken, languagesContext]);

  // Update lastUserMessage state whenever transcriptItems change.
  useEffect(() => {
    // Filter only MESSAGE items where role is 'user'
    const userMessages = transcriptItems.filter(
      (item) => item.type === "MESSAGE" && item.role === "user"
    );
    
    if (userMessages.length > 0) {
      const lastMsg = userMessages[userMessages.length - 1];
      if (lastMsg.status === "DONE") {
        setLastUserMessage(lastMsg);
        console.log("Last user message set to:", lastMsg);
      }
    } else {
      setLastUserMessage(null);
    }
  }, [transcriptItems]);

  // Use a ref to track if we've handled this message already
  const handledMessageRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (lastUserMessage && 
        lastUserMessage.status === "DONE" && 
        handledMessageRef.current !== lastUserMessage.itemId) {
      
      // Mark this message as handled to prevent duplicate processing
      handledMessageRef.current = lastUserMessage.itemId;
      
      const title = lastUserMessage.title ?? "";
      const displayTitle = title.startsWith("[") && title.endsWith("]")
        ? title.slice(1, -1)
        : title;
      
      console.log("Processing DONE message:", lastUserMessage.itemId);
      
      // First set the translation text
      setTranslationText(displayTitle);
      
      // Then change the agent
      console.log("Changing agent to translator");
      onAgentChange("translator");
  
      // Create a hidden prompt with the translation details.
      const promptObj = {
        text: displayTitle,
        spokenLanguage: languageSpoken,
        targetLanguage: translationLanguage
      };
      const promptStr = JSON.stringify(promptObj);
      
      console.log("Will send prompt:", promptStr);
      
      // Add a delay before sending the hidden prompt.
      setTimeout(() => {
        sendSimulatedUserMessage(promptStr);
      }, 100);
    }
  }, [
    lastUserMessage,
    languageSpoken,
    translationLanguage,
    onAgentChange,
    sendSimulatedUserMessage
  ]);

   // Add this useEffect to track assistant messages
   useEffect(() => {
    // Filter only MESSAGE items where role is 'assistant'
    const assistantMessages = transcriptItems.filter(
      (item) => item.type === "MESSAGE" && item.role === "assistant"
    );

    if (assistantMessages.length > 0) {
      const lastMsg = assistantMessages[assistantMessages.length - 1];
      if (lastMsg.status === "DONE") {
        setLastAssistantMessage(lastMsg);
        console.log("Last assistant message set to:", lastMsg);
      }
    } else {
      setLastAssistantMessage(null);
    }
  }, [transcriptItems]);

  // Add this useEffect to handle switching back to languageDetector 
 

  useEffect(() => {
    if (lastAssistantMessage &&
        lastAssistantMessage.status === "DONE" &&
        assistantHandledRef.current !== lastAssistantMessage.itemId &&
        currentAgentName === "translator") {

      // Mark this message as handled to prevent duplicate processing
      assistantHandledRef.current = lastAssistantMessage.itemId;

      console.log("Translation complete, switching back to languageDetector");

      // Add a small delay to ensure the translation has finished playing
      setTimeout(() => {
        onAgentChange("languageDetector");
      }, 500);
    }
  }, [
    lastAssistantMessage,
    currentAgentName,
    onAgentChange
  ]);

  let renderedMessage = null;
  if (lastUserMessage) {
    const { itemId, title = "", timestamp, role } = lastUserMessage;
    const displayTitle = title.startsWith("[") && title.endsWith("]")
      ? title.slice(1, -1)
      : title;
    renderedMessage = (
      <div key={itemId}>
        <div className="whitespace-pre-wrap">
          <ReactMarkdown>{displayTitle}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800">Translation</h2>
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-medium mb-2 text-gray-700">
          (Language: {languageSpoken || "Unknown"}):
        </h3>
        <div className="mt-4 space-y-4">
          {renderedMessage}
          <div>
            <h3 className="font-medium mb-2 text-gray-700">
              Translation ({translationLanguage}):
            </h3>
            <div className="whitespace-pre-wrap">
              <ReactMarkdown>{translationText}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationsPage;