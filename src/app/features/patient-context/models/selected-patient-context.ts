import { Permission } from '../../../core/models/permission-model';

export type PatientContextType = 'SELF' | 'CARER';

export interface SelectedPatientContext {
  patientRecordId: string;
  profileId: string;
  userId: string;
  firstName: string;
  lastName: string;
  contextType: PatientContextType;
  permissions: ReadonlySet<Permission>;
}

export function getPatientContextName(context: SelectedPatientContext): string {
  return `${context.firstName} ${context.lastName}`.trim();
}
