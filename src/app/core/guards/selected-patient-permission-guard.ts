import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';

import {PermissionRequirement} from '../models/permission-model';
import {PatientContextAuthorisation} from '../../features/patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../features/patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../features/patient-context/services/selected-patient-state';

/**
 * Checks the selected patient against the permission required by the route.
 * Missing requirements or insufficient access are redirected safely rather
 * than allowing the page to open.
 */
export const selectedPatientPermissionGuard: CanActivateFn = (route) => {
  const authorisation = inject(PatientContextAuthorisation);

  const selectedPatientState = inject(SelectedPatientState);
  const patientContextCoordinator = inject(PatientContextCoordinator);

  const router = inject(Router);

  const requirement = route.data['permission'] as PermissionRequirement | undefined;

  if (requirement === undefined) {
    return router.createUrlTree(['/access-denied']);
  }

  // A failed context load means the permission check cannot be trusted, so
  // return to the home page rather than treating incomplete state as access.
  if (patientContextCoordinator.loadFailed()) {
    return router.createUrlTree(['/home']);
  }

  const permitted = authorisation.can(
    selectedPatientState.selectedPatient(),
    requirement.resource,
    requirement.action,
  );

  return permitted ? true : router.createUrlTree(['/access-denied']);
};
