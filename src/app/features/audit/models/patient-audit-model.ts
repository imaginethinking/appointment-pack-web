export const PATIENT_RESOURCE_TYPES = [
  'PATIENT_RECORD',
  'PROFILE',
  'MEDICATION',
  'HEALTHCARE_CONTACT',
  'EMERGENCY_CONTACT',
  'BLOOD_TEST',
  'MEDICAL_HISTORY',
  'APPOINTMENT',
  'DOCUMENT',
  'APPOINTMENT_PACK',
  'PATIENT_CARER_ACCESS',
] as const;

export type PatientResourceType = typeof PATIENT_RESOURCE_TYPES[number];

export const PATIENT_ACTIVITY_ACTIONS = [
  'CREATED',
  'UPDATED',
  'ARCHIVED',
  'UPLOADED',
  'DOWNLOADED',
  'GENERATED',
  'INVITED',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'REVOKED',
  'PERMISSIONS_UPDATED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_REJECTED',
  'DEIDENTIFICATION_APPROVED',
  'SUMMARY_ACCEPTED',
  'SUMMARY_REJECTED',
] as const;

export type PatientActivityAction = typeof PATIENT_ACTIVITY_ACTIONS[number];

export interface PatientAuditResponse {
  id: string;
  actorUserId: string;
  actorDisplayName: string | null;
  resourceType: PatientResourceType;
  resourceId: string;
  action: PatientActivityAction;
  occurredAt: string;
}

export interface PatientAuditPageResponse {
  events: PatientAuditResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export function getPatientResourceTypeLabel(resourceType: PatientResourceType): string {
  switch (resourceType) {
    case 'PATIENT_RECORD':
      return 'Patient record';
    case 'PROFILE':
      return 'Profile';
    case 'MEDICATION':
      return 'Medication';
    case 'HEALTHCARE_CONTACT':
      return 'Healthcare contact';
    case 'EMERGENCY_CONTACT':
      return 'Emergency contact';
    case 'BLOOD_TEST':
      return 'Blood test';
    case 'MEDICAL_HISTORY':
      return 'Medical history';
    case 'APPOINTMENT':
      return 'Appointment';
    case 'DOCUMENT':
      return 'Document';
    case 'APPOINTMENT_PACK':
      return 'Appointment pack';
    case 'PATIENT_CARER_ACCESS':
      return 'Care network';
  }
}

export function getPatientActivityActionLabel(action: PatientActivityAction): string {
  switch (action) {
    case 'CREATED':
      return 'Created';
    case 'UPDATED':
      return 'Updated';
    case 'ARCHIVED':
      return 'Archived';
    case 'UPLOADED':
      return 'Uploaded';
    case 'DOWNLOADED':
      return 'Downloaded';
    case 'GENERATED':
      return 'Generated';
    case 'INVITED':
      return 'Invitation sent';
    case 'ACCEPTED':
      return 'Accepted';
    case 'DECLINED':
      return 'Declined';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REVOKED':
      return 'Access revoked';
    case 'PERMISSIONS_UPDATED':
      return 'Permissions updated';
    case 'APPOINTMENT_CONFIRMED':
      return 'Appointment confirmed';
    case 'APPOINTMENT_REJECTED':
      return 'Appointment rejected';
    case 'DEIDENTIFICATION_APPROVED':
      return 'De-identification approved';
    case 'SUMMARY_ACCEPTED':
      return 'Summary accepted';
    case 'SUMMARY_REJECTED':
      return 'Summary rejected';
  }
}
