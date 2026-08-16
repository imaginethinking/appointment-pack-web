export interface EmergencyContactRequest {
  name: string;
  relationship: string;
  phoneNumber: string;
  alternativePhoneNumber: string | null;
  email: string | null;
  notes: string | null;
}

export type CreateEmergencyContactRequest = EmergencyContactRequest;
export type UpdateEmergencyContactRequest = EmergencyContactRequest;

export interface EmergencyContactResponse {
  id: string;
  patientRecordId: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  alternativePhoneNumber: string | null;
  email: string | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
