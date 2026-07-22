export const PATIENT_RECORD_PERMISSIONS = [
  'patient-record:view',
  'patient-record:edit'
] as const;

export type PatientRecordPermission = typeof PATIENT_RECORD_PERMISSIONS[number];

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
  permissions: PatientRecordPermission[];
}

export interface UpdatePatientCarerPermissionsRequest {
  permissions: PatientRecordPermission[];
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
  permissions: PatientRecordPermission[];
  invitedAt: string;
  statusChangedAt: string;
}
