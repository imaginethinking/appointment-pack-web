import {inject} from '@angular/core';
import {CanActivateFn} from '@angular/router';
import {catchError, map, of} from 'rxjs';

import {PatientContextCoordinator} from '../../features/patient-context/services/patient-context-coordinator';

/**
 * Attempts to load the state needed for patient selection before the route
 * activates.
 *
 * Loading failures are retained by the coordinator rather than blocking
 * activation so the application can handle the failed state consistently.
 */
export const patientContextLoadGuard: CanActivateFn = () => {
  const coordinator = inject(PatientContextCoordinator);

  return coordinator.load().pipe(
    map(() => true),
    catchError(() => of(true)),
  );
};
