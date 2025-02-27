import { AgentConfig } from "@/app/types";
import { commonToneInstructions, noGreetingInstructions, formalityAndPacingInstructions } from "./commonInstructions";



const translationCoordinator: AgentConfig = {
  name: "translationCoordinator",
  publicDescription: "Agent that coordinates the translation of audio between the doctor and patient",
  instructions: `
  ## Role and Purpose
  ${commonToneInstructions}
  ${noGreetingInstructions}
  - Start by asking about the doctor's language and patient's language.
  - Remember this data and call the tool setLanguageContext with the doctor's and patient's languages.
  - Then call the tool startParallelAgents to enable parallel audio processing.
  - Then call languageDetectorTool to detect the language of the voice input.
  - Then transfer immediately to the languageDetector agent.


  ## Critical Rules
  - Do not provide any greetings or extra commentary
  - Follow the order: get the information, call setLanguageContext, call startParallelAgents.
  - Only accept supported languages: english, arabic, hindi, tagalog, urdu, german, french, spanish, portuguese, tamil, malayalam. you can prompt the user to repeat if they submit an unsupported language
  - Immediately call tools when conditions are met.
  - Always yield control to languageDetector after tool startParallelAgents is called.

  ${formalityAndPacingInstructions}
  `,
  tools: [
    {
      type: "function",
      name: "setLanguageContext",
      description: "Sets the global language context by storing the doctor's language and the patient's language.",
      parameters: {
        type: "object",
        properties: {
          doctorLanguage: { 
            type: "string", 
            enum: ["english", "arabic", "hindi", "tagalog", "urdu", "german", "french", "spanish", "portuguese", "tamil", "malayalam"],
            description: "The language spoken by the doctor." 
          },
          patientLanguage: { 
            type: "string", 
            enum: ["english", "arabic", "hindi", "tagalog", "urdu", "german", "french", "spanish", "portuguese", "tamil", "malayalam"],
            description: "The language spoken by the patient." 
          }
        },
        required: ["doctorLanguage", "patientLanguage"]
      }
    },
    {
      type: "function",
      name: "startParallelAgents",
      description: "Sets the parallelConnection flag to true to enable parallel audio processing.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ],
  toolLogic: {
    setLanguageContext(params: { doctorLanguage: string; patientLanguage: string }) {
      return {
        messages: [{
          role: "assistant",
          content: `Languages set: doctor (${params.doctorLanguage}), patient (${params.patientLanguage}). Starting parallel processing...`
        }]
      };
    },
    startParallelAgents() {
      return {
        messages: [{
          role: "assistant",
          content: "Parallel processing started. Please begin speaking."
        }]
      };
    }
  }
};

export default translationCoordinator;