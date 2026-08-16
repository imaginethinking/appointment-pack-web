import { AddressRequest, AddressResponse } from '../../../shared/models/address-model';

export interface HealthcareContactRequest {
  name: string;
  role: string | null;
  organisation: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: AddressRequest | null;
  notes: string | null;
}

export type CreateHealthcareContactRequest = HealthcareContactRequest;
export type UpdateHealthcareContactRequest = HealthcareContactRequest;

export interface HealthcareContactResponse {
  id: string;
  patientRecordId: string;
  name: string;
  role: string | null;
  organisation: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: AddressResponse | null;
  notes: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
