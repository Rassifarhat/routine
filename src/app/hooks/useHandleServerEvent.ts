"use client";

import { ServerEvent } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useSendClientEvent } from "@/app/hooks/useSendClientEvent";
import { useElementsStore } from "@/store/elementsStore";
import { useRef } from "react";

function generateId() {
  return crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString();
}

export function useHandleServerEvent() {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItemStatus,
  } = useTranscript();

  const { logServerEvent } = useEvent();
  
  const sendClientEvent = useSendClientEvent();

  const handleFunctionCall = async (functionCallParams: {
    name: string;
    call_id?: string;
    arguments: string;
  }) => {
    const args = JSON.parse(functionCallParams.arguments);
    const selectedAgentName = useElementsStore.getState().selectedAgentName;
    const selectedAgentConfigSet = useElementsStore.getState().selectedAgentConfigSet;
    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args);

    if (currentAgent?.toolLogic?.[functionCallParams.name]) {
      const fn = currentAgent.toolLogic[functionCallParams.name];
      const fnResult = await fn(args, transcriptItems);
      addTranscriptBreadcrumb(
        `function call result: ${functionCallParams.name}`,
        fnResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(fnResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    } else if (functionCallParams.name === "transferAgents") {
      const destinationAgent = args.destination_agent;
      if (destinationAgent === "operativeReportAssistant") {
        useElementsStore.getState().setSurgeryInfoNeeded(true);
      }
      const newAgentConfig =
        selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null;
      if (newAgentConfig) {
        useElementsStore.getState().setSelectedAgentName(destinationAgent);
      }
      const functionCallOutput = {
        destination_agent: destinationAgent,
        did_transfer: !!newAgentConfig,
      };
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(functionCallOutput),
        },
      });
      addTranscriptBreadcrumb(
        `function call: ${functionCallParams.name} response`,
        functionCallOutput
      );
    } else {
      const simulatedResult = { result: true };
      addTranscriptBreadcrumb(
        `function call fallback: ${functionCallParams.name}`,
        simulatedResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(simulatedResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    }
  };

  const handleServerEvent = (serverEvent: ServerEvent) => {
    logServerEvent(serverEvent);

    switch (serverEvent.type) {
      case "session.created": {
        if (serverEvent.session?.id) {
          useElementsStore.getState().setSessionStatus("CONNECTED");
          addTranscriptBreadcrumb(
            `session.id: ${
              serverEvent.session.id
            }\nStarted at: ${new Date().toLocaleString()}`
          );
        }
        break;
      }

      case "conversation.item.created": {
        let text =
          serverEvent.item?.content?.[0]?.text ||
          serverEvent.item?.content?.[0]?.transcript ||
          "";
        const role = serverEvent.item?.role as "user" | "assistant";
        const itemId = serverEvent.item?.id;

        if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
          break;
        }

        if (itemId && role) {
          if (role === "user" && !text) {
            text = "[Transcribing...]";
          }
          addTranscriptMessage(itemId, role, text);
        }
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        const itemId = serverEvent.item_id;
        const finalTranscript =
          !serverEvent.transcript || serverEvent.transcript === "\n"
            ? "[inaudible]"
            : serverEvent.transcript;
        if (itemId) {
          updateTranscriptMessage(itemId, finalTranscript, false);
        }
        break;
      }

      case "response.audio_transcript.delta": {
        const itemId = serverEvent.item_id;
        const deltaText = serverEvent.delta || "";
        if (itemId) {
          updateTranscriptMessage(itemId, deltaText, true);
         
        }
        break;
      }

      case "response.done": {
        if (serverEvent.response?.output) {
          const itemId = serverEvent.item?.id;
          const selectedAgentName = useElementsStore.getState().selectedAgentName;
          if (selectedAgentName === "patientToDoctor" || selectedAgentName === "doctorToPatient") {
            const assistantMessages = transcriptItems.filter(
              item => item.type === "MESSAGE" && item.role === "assistant" && !item.isHidden
            );
            
            const latestMessage = assistantMessages.length > 0 
              ? assistantMessages.sort((a, b) => b.createdAtMs - a.createdAtMs)[0] 
              : null;
            
            const messageTitle = latestMessage?.title || "";
            const charCount = messageTitle.length;
            const dynamicDelay = charCount * 40; // 200ms per character
            
            const finalDelay = Math.max(dynamicDelay, 3000);
            
            console.log(`Calculated delay of ${finalDelay}ms based on ${charCount} characters`);
            
            setTimeout(() => {
              console.log(`Dynamic delay complete (${finalDelay}ms) - unmuting microphone now`);
              useElementsStore.getState().setMicMuted(false);
            }, finalDelay);
          }
          serverEvent.response.output.forEach((outputItem) => {
            if (
              outputItem.type === "function_call" &&
              outputItem.name &&
              outputItem.arguments
            ) {
              handleFunctionCall({
                name: outputItem.name,
                call_id: outputItem.call_id,
                arguments: outputItem.arguments,
              });
            }
          });
        }
        break;
      }

      case "response.output_item.done": {
        const itemId = serverEvent.item?.id;
        if (itemId) {
          updateTranscriptItemStatus(itemId, "DONE");
        }
        break;
      }

      case "input_audio_buffer.speech_started": {
        // Only process this event if the selected agent is the translation coordinator
        const selectedAgentName = useElementsStore.getState().selectedAgentName;
        if (selectedAgentName === "patientToDoctor" || selectedAgentName === "doctorToPatient"||selectedAgentName === "translationCoordinator") {
          // Flag for when the user starts speaking
          const timestamp = new Date().toISOString();
          const flagId = serverEvent.event_id || generateId();
          useElementsStore.getState().setTheUserIsSpeaking(true);
          // Set assistantVoiceFinished to false when user starts speaking
          useElementsStore.getState().setAssistantVoiceFinished(false);
        }
        break;
      }

      case "input_audio_buffer.speech_stopped": {
        // Only process this event if the selected agent is the translation coordinator
        const selectedAgentName = useElementsStore.getState().selectedAgentName;
        if (selectedAgentName === "patientToDoctor" || selectedAgentName === "doctorToPatient"||selectedAgentName === "translationCoordinator") {
          // Flag for when the user stops speaking
          const timestamp = new Date().toISOString();
          const flagId = serverEvent.event_id || generateId();
          useElementsStore.getState().setTheUserIsSpeaking(false);
          
          // Mute the microphone when user stops speaking during translation
          if (selectedAgentName === "patientToDoctor" || selectedAgentName === "doctorToPatient") {
            useElementsStore.getState().setMicMuted(true);
            addTranscriptBreadcrumb(`Mic muted after user stopped speaking [${flagId}] at ${timestamp}`);
          }
        }
        break;
      }

      default:
        break;
    }
  };

  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  return handleServerEventRef;
}
