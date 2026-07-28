import { Permission } from '../../../core/models/permission-model';

export const PATIENT_RECORD_PERMISSIONS = [
  'patient-record:view',
  'patient-record:edit'
] as const satisfies readonly Permission[];

export const PATIENT_CARER_ACCESS_STATUSES = [
  'PENDING',
  'ACTIVE',
  'DECLINED',
  'REVOKED',
  'CANCELLED'
] as const;

export type PatientCarerAccessStatus = typeof PATIENT_CARER_ACCESS_STATUSES[number];

export interface CreateCarerInvitationRequest {
  carerEmail: string;
  permissions: Permission[];
}

export interface UpdatePatientCarerPermissionsRequest {
  permissions: Permission[];
}

export interface PatientAccessSummaryResponse {
  patientRecordId: string;
  userId: string;
  profileId: string;
  firstName: string;
  lastName: string;
}

export interface CarerAccessSummaryResponse {
  userId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PatientCarerAccessResponse {
  id: string;
  patient: PatientAccessSummaryResponse;
  carer: CarerAccessSummaryResponse;
  status: PatientCarerAccessStatus;
  permissions: Permission[];
  invitedAt: string;
  statusChangedAt: string;
}
