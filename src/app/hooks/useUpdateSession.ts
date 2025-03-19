"use client";

import { useState, useEffect } from "react";
import { useElementsStore } from "@/store/elementsStore";
import { usePatientDataStore } from "@/store/patientDataStore";
import { useSendClientEvent } from "./useSendClientEvent";
import { useSendSimulatedUserMessage } from "./useSendSimulatedUserMessage";
import createDoctorToPatientAgent from "../agentConfigs/doctorDtwin/doctorToPatient";
import createPatientToDoctorAgent from "../agentConfigs/doctorDtwin/patientToDoctor";

export function useUpdateSession() {
  const { selectedAgentName, selectedAgentConfigSet } = useElementsStore();
  const sendClientEvent = useSendClientEvent();
  const sendSimulatedUserMessage = useSendSimulatedUserMessage();

  // Retrieve languageSpoken and languagesContext from the store.
  const { languageSpoken, languagesContext, setLanguageSpoken } = usePatientDataStore();

  // Local state for chosen agent based on detected language.
  const [chosenAgent, setChosenAgent] = useState<string | undefined>(undefined);

  // When languageSpoken changes, update chosenAgent accordingly.
  useEffect(() => {
    if (!languageSpoken) {
      setChosenAgent(undefined);
      return;
    }
    // Convert everything to lower case for comparison.
    const detected = languageSpoken.toLowerCase();
    const doctorLang = languagesContext.doctorLanguage?.toLowerCase();
    const patientLang = languagesContext.patientLanguage?.toLowerCase();

    // If the detected language matches the doctor's language,
    // then the doctor is speaking so we want the agent that translates from doctor to patient.
    if (detected === doctorLang) {
      setChosenAgent("doctorToPatient");
    }
    // If the detected language matches the patient's language,
    // then the patient is speaking so we want the agent that translates from patient to doctor.
    else if (detected === patientLang) {
      setChosenAgent("patientToDoctor");
    } else {
      setChosenAgent(undefined);
    }
  }, [languageSpoken, languagesContext]);

  const updateSession = (shouldTriggerResponse: boolean = false, isPTTActive: boolean) => {
    let currentAgent: any;

    // If a chosenAgent has been determined via the detected language, use that.
    if (chosenAgent) {
      if (chosenAgent === "doctorToPatient") {
        currentAgent = createDoctorToPatientAgent();
      } else if (chosenAgent === "patientToDoctor") {
        currentAgent = createPatientToDoctorAgent();
      }
    }
    // Otherwise, fall back to the default behavior (back-and-forth switching).
    else {
      if (selectedAgentName === "doctorToPatient") {
        currentAgent = createDoctorToPatientAgent();
      } else if (selectedAgentName === "patientToDoctor") {
        currentAgent = createPatientToDoctorAgent();
      } else {
        currentAgent = selectedAgentConfigSet?.find((a) => a.name === selectedAgentName);
      }
    }

    if (!currentAgent) return;

    // Only clear the audio buffer if the current agent is not one of our translation agents.
    if (currentAgent.name !== "doctorToPatient" && currentAgent.name !== "patientToDoctor") {
      sendClientEvent(
        { type: "input_audio_buffer.clear" },
        "clear audio buffer on session update"
      );
    }

    let sessionUpdateEvent: any;
    if (currentAgent.name === "doctorToPatient" || currentAgent.name === "patientToDoctor") {
      shouldTriggerResponse = true;
      const turnDetection = isPTTActive
        ? null
        : {
            type: "server_vad",
            threshold: 0.6,
            prefix_padding_ms: 300,
            silence_duration_ms: 1000,
            create_response: true,
          };

      sessionUpdateEvent = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: currentAgent.instructions,
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: turnDetection,
          tools: currentAgent.tools,
        },
      };
    } else {
      const turnDetection = isPTTActive
        ? null
        : {
            type: "server_vad",
            threshold: 0.6,
            prefix_padding_ms: 300,
            silence_duration_ms: 800,
            create_response: true,
          };

      sessionUpdateEvent = {
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: currentAgent.instructions,
          voice: "sage",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: turnDetection,
          tools: currentAgent.tools,
        },
      };
    }

    sendClientEvent(sessionUpdateEvent);
    if (shouldTriggerResponse && currentAgent.name !== "doctorToPatient" && currentAgent.name !== "patientToDoctor") {
      sendSimulatedUserMessage("hello assistant");
    }
    // After updating the session, reset languageSpoken and chosenAgent so a new segment can be processed.
    setLanguageSpoken("");
    setChosenAgent(undefined);
  };

  return updateSession;
}