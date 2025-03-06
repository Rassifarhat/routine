import { AgentConfig } from "@/app/types";
import { commonToneInstructions, noGreetingInstructions, formalityAndPacingInstructions } from "./commonInstructions";
import { usePatientDataStore } from "@/store/patientDataStore";
import { useElementsStore } from "@/store/elementsStore";

const surgicalEditor: AgentConfig = {
    name: "surgicalEditor",
    publicDescription: "Handles surgical report updates and edits the report. ",
    instructions: `
  ## Personality and Tone
  ${commonToneInstructions}
  ${noGreetingInstructions}
  - Keep responses concise and focused solely on editing the report.
  - Maintain the same fast-paced flow as the previous agent.
  - ⚡ Start with **"anything you like to edit."** every time.
  - Always seeks explicit user confirmation for emails
  
  
  ## Primary Tasks
  1. Listen for and process voice requests to update the surgical report and call the tool updateSurgicalReportTool with every update from the doctor. you can call the tool updateSurgicalReportTool multiple times. always prompt the doctor if he is satisfied with the report
  2. when the doctor is satisfied with the report, ask the doctor if he wants to send an email of the report.
  3. when the doctor wants to send an email of the report, call the tool sendEmail .
  4.  transfer control to chiefAssistant after calling sendEmail tool and sending the email trigger 
  
  ## Voice Update Handling
  - Listen carefully for additional voice updates concerning the surgical report 
  - For each voice update, call updateSurgicalReportTool with the update text
  - if email is requested or confirmed by user, call sendEmail tool.
  - Return the update text to update the patient data context
  - Be very fast-paced and brief with updates
  - Listen carefully for email sending requests and you can prompt the user to send an email.
  - your final step is to transfer control back to chiefAssistant after sending the email trigger 
  
  ## Critical Rules
  - NEVER explain what you're doing
  - NEVER offer to do anything else
  - ALWAYS start with "anything you like to edit"
  - ALWAYS ask for email confirmation when edits are complete
  - ALWAYS transfer to chiefAssistant after email trigger
  - NEVER mention that you are transferring
  
  ${formalityAndPacingInstructions}
  `,
    tools: [
      {
        type: "function",
        name: "updateSurgicalReportTool",
        description: "Updates the surgical report with the specified text.",
        parameters: {
          type: "object",
          properties: {
            updateText: {
              type: "string",
              description: "The text to update the surgical report with."
            }
          },
          required: ["updateText"]
        }
      },
      {
        type: "function",
        name: "sendEmail",
        description: "Sends the finalized surgical report via email.",
        parameters: {
          type: "object",
          properties: {
            goal: {
              type: "string",
              description: "to send the email."
            }
          },
          required: ["goal"]
        }
      }
    ],
    toolLogic: {
      updateSurgicalReportTool({ updateText }) {
        // Only proceed if updateText actually contains text
        if (updateText && updateText.trim() !== "") {
          // Get the patient data store functions
          const { clearPatientSurgicalData, setPatientSurgicalData } = usePatientDataStore.getState();
          
          // Clear the patient surgical data first
          clearPatientSurgicalData();
          
          // Then set it with the update text
          setPatientSurgicalData(updateText);
        }
        
        return {
          messages: [{
            role: "user",
            content: "remember to prompt the doctor to send an email if the doctor is satisfied with the report"
          }]
        };
      },
      sendEmail({ goal }) {
        // Get the setSendEmailStatus function from the elements store
        const { setSendEmailStatus } = useElementsStore.getState();
        
        // Set the email status to 'sending'
        setSendEmailStatus('sending');
        
        return {
          messages: [{
            role: "user",
            content: "please tell doctor that email is being sent and transfer control to chiefAssistant"
          }]
        };
      }
    }
  };
  export default surgicalEditor;