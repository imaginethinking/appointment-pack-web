export interface AppointmentAddressInput {
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
}

export interface AppointmentConfirmationRequest {
  date: string;
  startTime: string;
  endTime: string | null;
  service: string | null;
  appointmentType: string | null;
  clinicianOrTeam: string | null;
  locationName: string | null;
  address: AppointmentAddressInput | null;
  notes: string | null;
}

export interface AppointmentResponse {
  id: string;
  patientRecordId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  service: string | null;
  appointmentType: string | null;
  clinicianOrTeam: string | null;
  locationName: string | null;
  address: AppointmentAddressInput | null;
  notes: string | null;
  sourceDocumentId: string | null;
}
