// src/store/patientDataStore.ts
import { create } from "zustand";

// Define the languages context interface
export interface LanguagesContext {
  patientLanguage: string;
  doctorLanguage: string;
}

interface PatientDataState {
  // Patient surgical data
  patientSurgicalData: string;
  
  // Language information
  languageSpoken: string;
  setLanguageSpoken: (language: string) => void;
  
  // Languages context
  languagesContext: LanguagesContext;
  setLanguagesContext: (context: LanguagesContext) => void;
  
  // Translation text
  translationText: string;
  setTranslationText: (text: string) => void;
  
  // Operations for patient surgical data
  setPatientSurgicalData: (data: string) => void;
  appendPatientSurgicalData: (data: string) => void;
  clearPatientSurgicalData: () => void;
}

export const usePatientDataStore = create<PatientDataState>((set) => ({
  // Initialize with empty string
  patientSurgicalData: "",
  
  // Initialize language information with empty value
  languageSpoken: "",
  setLanguageSpoken: (language) => set({ 
    languageSpoken: language 
  }),
  
  // Initialize languages context with empty values
  languagesContext: {
    patientLanguage: "",
    doctorLanguage: ""
  },
  setLanguagesContext: (context) => set({ 
    languagesContext: context 
  }),
  
  // Initialize translation text with empty value
  translationText: "",
  setTranslationText: (text) => set({ 
    translationText: text 
  }),
  
  // Set patient surgical data (replaces existing data)
  setPatientSurgicalData: (data) => set({ 
    patientSurgicalData: data 
  }),
  
  // Append to existing patient surgical data
  appendPatientSurgicalData: (data) => set((state) => ({ 
    patientSurgicalData: state.patientSurgicalData + data 
  })),
  
  // Clear patient surgical data
  clearPatientSurgicalData: () => set({ 
    patientSurgicalData: "" 
  }),
}));
