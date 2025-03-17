"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useTranscript } from "@/app/contexts/TranscriptContext"
import { useEvent } from "@/app/contexts/EventContext"
import { usePatientDataStore } from "@/store/patientDataStore";
import { useElementsStore } from "@/store/elementsStore";
import { useSendEmail } from "@/app/hooks/useSendEmail";
import Message from "./message";
import {marked} from 'marked';

export default function SurgicalScribePage() {
  // Get patient surgical data context including clear method
  const { logClientEvent } = useEvent();
  const { 
    patientSurgicalData, 
    setPatientSurgicalData, 
    appendPatientSurgicalData, 
    clearPatientSurgicalData 
  } = usePatientDataStore();
  
  const { 
    loadSurgicalPage,
    sendEmailStatus,
    setSendEmailStatus,
    setLoadSurgicalPage,
    surgeryInfoNeeded,
    setSurgeryInfoNeeded
  } = useElementsStore();

  // Initialize the chat hook with our API endpoint and an explicit id.
  const { messages, append } = useChat({
    api: "/api/operativeScribeServer",
    id: "surgical-scribe",
  });
  const { transcriptItems } = useTranscript();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [convertedContent, setConvertedContent] = useState("");
  const lastSubmitted = useRef<string | null>(null);

  // Get the last message from the server (assistant) if available
  const lastServerMessage = messages.length > 0 
    ? messages.filter(m => m.role === 'assistant').pop()?.content || ''
    : '';
    useEffect(() => {
      async function convertMarkdown() {
        try {
          const html = await marked(lastServerMessage);
          setConvertedContent(html);
        } catch (error) {
          console.error("Error converting markdown:", error);
        }
      }
      if (lastServerMessage) {
        convertMarkdown();
      }
    }, [lastServerMessage]);
const plainTextContent = lastServerMessage.replace(/<[^>]*>/g, '');

const emailResponse = useSendEmail({ 
  data: { 
    html: convertedContent, 
    plainText: plainTextContent 
  } 
});

  // Handle email response
  useEffect(() => {
    if (emailResponse && emailResponse.success) {
      // Reset all flags when email is sent successfully
      setSendEmailStatus('idle');
      setLoadSurgicalPage(false);
      setSurgeryInfoNeeded(false);
      console.log('Email sent successfully, flags reset');
    }
  }, [emailResponse, setSendEmailStatus, setLoadSurgicalPage, setSurgeryInfoNeeded]);

  // Whenever patientSurgicalData changes (and is new), trigger a new submission.
  useEffect(() => {
    if (patientSurgicalData && patientSurgicalData !== lastSubmitted.current) {
      console.log("Appending new patient surgical data via hidden submission:", patientSurgicalData);
      append({ content: patientSurgicalData, role: "user" });
      lastSubmitted.current = patientSurgicalData;
    }
  }, [patientSurgicalData, append]);

  // Auto-scroll when messages update.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-1/2 overflow-auto text-black rounded-xl bg-white">
      <div
        ref={scrollRef}
        className="p-6 text-black"
      >
        {messages.map((m, index) => (
          <Message key={index} message={m} />
        ))}
        {sendEmailStatus === 'sending' && (
          <div className="text-blue-500 mt-4">Sending email...</div>
        )}
        {sendEmailStatus === 'done' && (
          <div className="text-green-500 mt-4">Email sent successfully!</div>
        )}
      </div>
    </div>
  );
}