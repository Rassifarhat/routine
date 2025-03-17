import { AgentConfig } from "@/app/types";
import chiefAssistant from "./chiefAssistant";
import operativeReportAssistant from "./operativeReportAssistant";
import surgicalEditor from "./surgicalEditor";
import { injectTransferTools } from "../utils";
import translationCoordinator from "./translationCoordinator";
import languageDetector from "./languageDetector";
import translator from "./translator";
import patientToDoctor from "./patientToDoctor";
import doctorToPatient from "./doctorToPatient";

// Define agent relationships
chiefAssistant.downstreamAgents = [operativeReportAssistant, translationCoordinator]; 
operativeReportAssistant.downstreamAgents = [surgicalEditor];
surgicalEditor.downstreamAgents = [chiefAssistant];
translationCoordinator.downstreamAgents = [];

languageDetector.downstreamAgents = [];
translator.downstreamAgents = [];
patientToDoctor.downstreamAgents = [];
doctorToPatient.downstreamAgents = [];

// Inject transfer tools to all agents
const doctorAgents = injectTransferTools([
  chiefAssistant, 
  operativeReportAssistant, 
  surgicalEditor, 
  translationCoordinator, 
  languageDetector,
  translator,
  patientToDoctor,
  doctorToPatient
]);

// Export the agent set
export default doctorAgents;
