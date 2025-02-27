import { AgentConfig } from "@/app/types";
import chiefAssistant from "./chiefAssistant";
import operativeReportAssistant from "./operativeReportAssistant";
import surgicalEditor from "./surgicalEditor";
import { injectTransferTools } from "../utils";
import translationCoordinator from "./translationCoordinator";
import languageDetector from "./languageDetector";

// Define agent relationships
chiefAssistant.downstreamAgents = [operativeReportAssistant, translationCoordinator]; 
operativeReportAssistant.downstreamAgents = [surgicalEditor];
surgicalEditor.downstreamAgents = [chiefAssistant];
translationCoordinator.downstreamAgents = [languageDetector];

// Inject transfer tools to all agents
const doctorAgents = injectTransferTools([
  chiefAssistant, 
  operativeReportAssistant, 
  surgicalEditor, 
  translationCoordinator, 
  languageDetector
]);

// Export the agent set
export default doctorAgents;
