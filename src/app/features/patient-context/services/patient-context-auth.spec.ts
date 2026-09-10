// These tests check the frontend permission rules for the currently selected patient.
// Spring still makes the final security decision, but the frontend should hide or block invalid actions consistently.

import {Permission} from '../../../core/models/permission-model';
import {SelectedPatientContext} from '../models/selected-patient-context';
import {PatientContextAuthorisation} from './patient-context-auth';

describe('PatientContextAuthorisation', () => {
  const authorisation = new PatientContextAuthorisation();

  // Checks the safe default when the application has no patient context selected.
  it('denies permissions when there is no selected patient', () => {
    expect(authorisation.can(null, 'patient-record', 'view')).toBe(false);
    expect(authorisation.has(null, 'document:view')).toBe(false);
  });

  // Checks that a user viewing their own record does not need carer permission strings.
  it('gives the owner inherent access to patient-scoped permissions', () => {
    // SELF means the signed-in user owns this patient record, so carer permission strings are not needed.
    const context = createContext('SELF', []);

    expect(authorisation.can(context, 'patient-record', 'edit')).toBe(true);
    expect(authorisation.can(context, 'document', 'upload')).toBe(true);
    expect(authorisation.can(context, 'appointment-pack', 'create')).toBe(true);
  });

  // Checks that a carer is allowed when both the requested permission and its dependencies are present.
  it('allows a carer permission when the full prerequisite chain is granted', () => {
    const context = createContext('CARER', [
      'patient-record:view',
      'document:view',
      'document:edit',
      'document:upload',
    ]);

    expect(authorisation.can(context, 'document', 'upload')).toBe(true);
  });

  // Checks that simply having a child permission string cannot bypass a missing prerequisite.
  it('denies a child permission when its direct prerequisite is missing', () => {
    // Having the child string on its own should not bypass the dependency rules.
    const context = createContext('CARER', [
      'patient-record:view',
      'document:edit',
    ]);

    expect(authorisation.has(context, 'document:edit')).toBe(true);
    expect(authorisation.can(context, 'document', 'edit')).toBe(false);
  });

  // Checks the full recursive rule back to patient-record:view.
  it('denies a permission when the patient-record prerequisite is missing', () => {
    const context = createContext('CARER', [
      'appointment-pack:view',
      'appointment-pack:create',
    ]);

    expect(authorisation.can(context, 'appointment-pack', 'create')).toBe(false);
  });

  // Checks the helper methods used when a page needs several possible permissions.
  it('supports all/any checks against explicitly granted carer permissions', () => {
    const context = createContext('CARER', [
      'patient-record:view',
      'appointment:view',
    ]);

    expect(authorisation.hasAll(context, ['patient-record:view', 'appointment:view'])).toBe(true);
    expect(authorisation.hasAll(context, ['appointment:view', 'appointment:edit'])).toBe(false);
    expect(authorisation.hasAny(context, ['appointment:edit', 'appointment:view'])).toBe(true);
  });
});

// Creates a small patient context for the tests, with only the context type and permissions changing.
function createContext(
  contextType: 'SELF' | 'CARER',
  permissions: readonly Permission[],
): SelectedPatientContext {
  return {
    patientRecordId: 'patient-record-1',
    profileId: 'profile-1',
    userId: 'user-1',
    firstName: 'Test',
    lastName: 'Patient',
    contextType,
    permissions: new Set(permissions),
  };
}
