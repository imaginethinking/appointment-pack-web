import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { PermissionRequirement } from '../models/permission-model';
import { PatientContextAuthorisation } from '../../features/patient-context/services/patient-context-auth';
import { SelectedPatientState } from '../../features/patient-context/services/selected-patient-state';

export const selectedPatientPermissionGuard: CanActivateFn = (route) => {
  const authorisation = inject(PatientContextAuthorisation);

  const selectedPatientState = inject(SelectedPatientState);

  const router = inject(Router);

  const requirement = route.data['permission'] as PermissionRequirement | undefined;

  if (requirement === undefined) {
    return router.createUrlTree(['/access-denied']);
  }

  const permitted = authorisation.can(
    selectedPatientState.selectedPatient(),
    requirement.resource,
    requirement.action,
  );

  return permitted ? true : router.createUrlTree(['/access-denied']);
};
