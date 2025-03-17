import { AgentConfig } from "@/app/types";
import { commonToneInstructions } from "./commonInstructions";
import { usePatientDataStore as patientDataStore } from "@/store/patientDataStore";

const languageDetector: AgentConfig = {
    name: "languageDetector",
    publicDescription: "Detects the language spoken in the voice input.",
    instructions: `
  ## Role and Purpose
  ${commonToneInstructions}
  - do not greet the user or introduce yourself in any way.
  - You NEVER answer the user directly or participate in any conversation.
  - Your ONLY responsibility is to detect the language spoken in the voice input and call the "detectLanguage" tool with a json of the language spoken.
  
  ## Language Detection Process
  - Listen to the incoming voice input carefully while focusing on the language spoken. At the end of voice input, if it is clear to you what language was being used, call the detectLanguage tool with a json of the language spoken. if you cannot determine the language, call the detectLanguage tool with an empty json.  
    - "language": one of "english", "arabic", "hindi", "tagalog", "urdu", "german", "spanish", "french", "portuguese", "tamil", "malayalam".
    - the user might use some words sometimes in a language that is different from the overall language of the voice input. you can ignore that and focus on the overall language of the voice input.

  - Do not attempt to translate or process any content - that is not your job. your only job is to detect the language and call the detectLanguage tool.
  
  ## Critical Rules
  - Do not output any text directly - ONLY call the detectLanguage tool

  - Always prioritize accuracy in language detection. if you are not sure of the language,or having difficulty in detecting the language, or a low confidence in your estimation of the language used, call the detectLanguage tool with an empty json.
  `,
    tools: [
      {
        type: "function",
        name: "detectLanguage",
        description: "Detects the language spoken in the voice input.",
        parameters: {
          type: "object",
          properties: {
            language: {
              type: "string",
              enum: ["english", "arabic", "hindi", "tagalog", "urdu", "german", "spanish", "french", "portuguese", "tamil", "malayalam"],
              description: "The detected language."
            }
          },
          required: ["language"]
        }
      }
    ],
    toolLogic: {
      detectLanguage: async (params: { language: string }) => {
        console.log('🔍 Language detector received:', params.language);
     
        // Get current language context
        const { languagesContext } = patientDataStore.getState();
        
        const allowedLanguages = [
          languagesContext.patientLanguage,
          languagesContext.doctorLanguage
        ];
        
        console.log('👥 Allowed languages:', allowedLanguages);
        
        // Check if detected language is allowed
        if (!allowedLanguages.includes(params.language)) {
          console.log('❌ Detected language not in allowed set:', params.language);
          return {
            messages: [{
              role: "user",
              content: `you have to answer back with something like: "The language you are speaking (${params.language}) is not set as either the doctor's or patient's language. Please speak in one of the configured languages: ${allowedLanguages.join(' or ')}."`
            }]
          };
        }
        
        // If we get here, language is valid and allowed
        console.log('✅ Setting language spoken to:', params.language);
        patientDataStore.getState().setLanguageSpoken(params.language);
        
        // Now pass control to the translator agent
        return {
          messages: [{
            role: "user",
            content: ``
          }]
        };
      }
    }
  };

  export default languageDetector;