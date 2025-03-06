// src/store/patientDataStore.ts
import { create } from "zustand";

interface PatientDataState {
  // Patient surgical data
  patientSurgicalData: string;
  
  // Operations for patient surgical data
  setPatientSurgicalData: (data: string) => void;
  appendPatientSurgicalData: (data: string) => void;
  clearPatientSurgicalData: () => void;
}

export const usePatientDataStore = create<PatientDataState>((set) => ({
  // Initialize with empty string
  patientSurgicalData: "",
  
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
