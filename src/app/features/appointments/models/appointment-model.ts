import {AddressResponse, PartialAddressRequest} from '../../../shared/models/address-model';

export interface AppointmentRequest {
  date: string;
  startTime: string;
  endTime: string | null;
  service: string | null;
  appointmentType: string | null;
  clinicianOrTeam: string | null;
  locationName: string | null;
  address: PartialAddressRequest | null;
  notes: string | null;
}

export type CreateAppointmentRequest = AppointmentRequest;
export type UpdateAppointmentRequest = AppointmentRequest;
export type AppointmentConfirmationRequest = AppointmentRequest;

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
  address: AddressResponse | null;
  notes: string | null;
  sourceDocumentId: string | null;
  archivedAt: string | null;
}

export type AppointmentAddressInput = PartialAddressRequest;
