import { Permission } from '../../../core/models/permission-model';

export interface CareNetworkPermissionOption {
  permission: Permission;
  label: string;
  description: string;
}

export interface CareNetworkPermissionGroup {
  label: string;
  permissions: readonly CareNetworkPermissionOption[];
}

export const CARE_NETWORK_PERMISSION_GROUPS = [
  {
    label: 'Patient record',
    permissions: [
      {
        permission: 'patient-record:view',
        label: 'View patient record',
        description: 'View patient-record details.',
      },
      {
        permission: 'patient-record:edit',
        label: 'Edit patient record',
        description: 'Update patient-record details.',
      },
    ],
  },
  {
    label: 'Documents',
    permissions: [
      {
        permission: 'document:view',
        label: 'View documents',
        description: 'View document details and download stored documents.',
      },
      {
        permission: 'document:edit',
        label: 'Process and review documents',
        description: 'Process, review and archive documents when allowed.',
      },
      {
        permission: 'document:upload',
        label: 'Upload documents',
        description: 'Upload new documents for the patient.',
      },
    ],
  },
  {
    label: 'Medical history',
    permissions: [
      {
        permission: 'history:view',
        label: 'View medical history',
        description: 'View medical-history entries.',
      },
      {
        permission: 'history:edit',
        label: 'Edit medical history',
        description: 'Perform actions that write to medical history.',
      },
    ],
  },
] as const satisfies readonly CareNetworkPermissionGroup[];

export const DEFAULT_CARER_PERMISSIONS = [
  'patient-record:view',
] as const satisfies readonly Permission[];

export const PATIENT_CARER_ACCESS_STATUSES = [
  'PENDING',
  'ACTIVE',
  'DECLINED',
  'REVOKED',
  'CANCELLED',
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
