export const APPOINTMENT_PACK_ITEM_TYPES = [
  'MEDICATION',
  'HEALTHCARE_CONTACT',
  'EMERGENCY_CONTACT',
  'MEDICAL_HISTORY',
  'BLOOD_TEST',
] as const;

export type AppointmentPackItemType = typeof APPOINTMENT_PACK_ITEM_TYPES[number];

export interface AppointmentPackGenerationRequest {
  appointmentId: string;
  title: string | null;
  notes: string | null;
  medicationIds: string[];
  healthcareContactIds: string[];
  emergencyContactIds: string[];
  medicalHistoryEntryIds: string[];
  bloodTestIds: string[];
}

export interface AppointmentPackItemResponse {
  resourceType: AppointmentPackItemType;
  resourceId: string;
  displayOrder: number;
}

export interface AppointmentPackResponse {
  id: string;
  patientRecordId: string;
  appointmentId: string;
  title: string;
  notes: string | null;
  generatedByUserId: string;
  generatedAt: string;
  fileName: string;
  fileSize: number;
  archivedAt: string | null;
  items: AppointmentPackItemResponse[];
}

export function getAppointmentPackItemTypePluralLabel(itemType: AppointmentPackItemType): string {
  switch (itemType) {
    case 'MEDICATION':
      return 'Medications';
    case 'HEALTHCARE_CONTACT':
      return 'Healthcare contacts';
    case 'EMERGENCY_CONTACT':
      return 'Emergency contacts';
    case 'MEDICAL_HISTORY':
      return 'Medical-history entries';
    case 'BLOOD_TEST':
      return 'Blood tests';
  }
}
