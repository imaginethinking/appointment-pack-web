/**
 * Contains the application page recorded for a page view.
 */
export const APPLICATION_PAGES = [
  'LANDING',
  'DASHBOARD',
  'PATIENT_RECORD',
  'DOCUMENTS',
  'APPOINTMENTS',
  'MEDICATIONS',
  'MEDICAL_HISTORY',
  'BLOOD_RESULTS',
  'CONTACTS',
  'APPOINTMENT_PACKS',
  'ACTIVITY_HISTORY',
  'CARER_NETWORK',
  'PROFILE',
] as const;

export type ApplicationPage = typeof APPLICATION_PAGES[number];

export interface PageViewRequest {
  page: ApplicationPage;
}

/**
 * Returns the display label for an application page.
 */
export function getApplicationPageLabel(page: ApplicationPage): string {
  switch (page) {
    case 'LANDING':
      return 'Landing page';
    case 'DASHBOARD':
      return 'Dashboard';
    case 'PATIENT_RECORD':
      return 'Patient record';
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
    case 'ACTIVITY_HISTORY':
      return 'Activity history';
    case 'CARER_NETWORK':
      return 'Care network';
    case 'PROFILE':
      return 'Profile';
  }
}
