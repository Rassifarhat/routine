import { AgentConfig } from "@/app/types";
import { commonToneInstructions, noGreetingInstructions, formalityAndPacingInstructions } from "./commonInstructions";
import { useElementsStore } from "@/store/elementsStore";
import { usePatientDataStore, LanguagesContext } from "@/store/patientDataStore";


const translationCoordinator: AgentConfig = {
  name: "translationCoordinator",
  publicDescription: "Agent that coordinates the translation of audio between the doctor and patient",
  instructions: `
  ## Role and Purpose
  ${commonToneInstructions}
  ${noGreetingInstructions}
  - Start by asking about the doctor's language and patient's language.
  - Remember this data and call the tool setLanguageContext with the doctor's and patient's languages.
  - finally transfer to languageDetector agent to detect the language of the voice input.


  ## Critical Rules
  - Do not provide any greetings or extra commentary
  - Follow the order: get the information, call setLanguageContext, transfer to languageDetector agent.
  - Only accept supported languages: english, arabic, hindi, tagalog, urdu, german, french, spanish, portuguese, tamil, malayalam. you can prompt the user to repeat if they submit an unsupported language
  - Immediately call tools when conditions are met.
  - ALWAYS yield control to languageDetector after tool setLanguageContext is called.

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
    }
  ],
  toolLogic: {
    setLanguageContext(params: { doctorLanguage: string; patientLanguage: string }) {
      console.log(`Translation Coordinator: setting language context - Patient: ${params.patientLanguage}, Doctor: ${params.doctorLanguage}`);
      
      // Update the languages context in the patient data store
      const languagesContext: LanguagesContext = {
        patientLanguage: params.patientLanguage,
        doctorLanguage: params.doctorLanguage
      };
      usePatientDataStore.getState().setLanguagesContext(languagesContext);
      
      // Set the flag to show the Translations Page
      useElementsStore.getState().setShowTranslationsPage(true);
      
      return {
        messages: [{
          role: "assistant",
          content: ` transfer control to languageDetector now and start with something like:  "please proceed with your conversation with the patient" `
        }]
      };
    }
  }
};

export default translationCoordinator;