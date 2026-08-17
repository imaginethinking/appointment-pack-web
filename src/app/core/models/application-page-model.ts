export const APPLICATION_PAGES = [
  'DASHBOARD',
  'DOCUMENTS',
  'APPOINTMENTS',
  'MEDICATIONS',
  'MEDICAL_HISTORY',
  'BLOOD_RESULTS',
  'CONTACTS',
  'APPOINTMENT_PACKS',
  'CARER_NETWORK',
  'PROFILE',
] as const;

export type ApplicationPage = typeof APPLICATION_PAGES[number];

export interface PageViewRequest {
  page: ApplicationPage;
}

export function getApplicationPageLabel(page: ApplicationPage): string {
  switch (page) {
    case 'DASHBOARD':
      return 'Dashboard';
    case 'DOCUMENTS':
      return 'Documents';
    case 'APPOINTMENTS':
      return 'Appointments';
    case 'MEDICATIONS':
      return 'Medications';
    case 'MEDICAL_HISTORY':
      return 'Medical history';
    case 'BLOOD_RESULTS':
      return 'Blood results';
    case 'CONTACTS':
      return 'Contacts';
    case 'APPOINTMENT_PACKS':
      return 'Appointment packs';
    case 'CARER_NETWORK':
      return 'Care network';
    case 'PROFILE':
      return 'Profile';
  }
}
