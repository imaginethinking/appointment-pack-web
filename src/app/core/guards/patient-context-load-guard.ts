import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { PatientContextCoordinator } from '../../features/patient-context/services/patient-context-coordinator';

export const patientContextLoadGuard: CanActivateFn = () => {
  const coordinator = inject(PatientContextCoordinator);

  return coordinator.load().pipe(
    map(() => true),
    catchError(() => of(true)),
  );
};
