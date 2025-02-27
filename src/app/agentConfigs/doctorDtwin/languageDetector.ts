import { AgentConfig } from "@/app/types";
import { commonToneInstructions } from "./commonInstructions";

const languageDetector: AgentConfig = {
    name: "languageDetector",
    publicDescription: "Detects the language spoken in the voice input.",
    instructions: `
  ## Role and Purpose
  ${commonToneInstructions}
  - You NEVER answer the user directly or participate in any conversation.
  - Your ONLY task is to detect the language spoken in the voice input and call the tool "detectLanguage". 
  - You listen to the incoming voice input. If you are absolutely sure about the language, call the tool, otherwise wait for the full voice input.
  - At the end of the voice input, determine the language being spoken by calling the tool. ALWAYS.
  - When you are sufficiently confident (e.g. confidence ≥ 0.90) about the language, or at the end of the voice input, call the tool "detectLanguage" with a JSON object containing:
     - "language": one of "english", "arabic", "hindi", "tagalog", "urdu", "german", "spanish", "french", "portuguese", "tamil", "malayalam"
    
  ## Critical Rules
  - The voice input will never indicate it is asking about a specific language. Still, your only job is to call the tool with a JSON object containing "language".
  - The voice input may indicate that it is asking you a question. Still you never answer. You only detect the language being spoken and call the tool.
  - Do not output any extra text— ONLY calling the tool with the JSON object is allowed.
  - Call the tool only once per voice input.
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
        console.log(`Language detector: setting language to ${params.language}`);
        return {
          messages: [{
            role: "user",
            content: `never answer directly, stay absolutely quiet for now`
          }]
        };
      }
    }
  };

  export default languageDetector;