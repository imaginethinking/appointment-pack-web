import {Permission} from '../../../core/models/permission-model';

export type PatientContextType = 'SELF' | 'CARER';

/**
 * Holds the patient details and permissions used for the current patient context.
 */
export interface SelectedPatientContext {
  patientRecordId: string;
  profileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  contextType: PatientContextType;
  permissions: ReadonlySet<Permission>;
}

/**
 * Returns the full name shown for a patient context.
 */
export function getPatientContextName(context: SelectedPatientContext): string {
  return `${context.firstName} ${context.lastName}`.trim();
}
