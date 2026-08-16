export interface MedicationRequest {
  name: string;
  dose: string | null;
  form: string | null;
  instructions: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export type CreateMedicationRequest = MedicationRequest;
export type UpdateMedicationRequest = MedicationRequest;

export interface MedicationResponse {
  id: string;
  patientRecordId: string;
  name: string;
  dose: string | null;
  form: string | null;
  instructions: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
