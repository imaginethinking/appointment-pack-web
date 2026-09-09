import { inject } from '@angular/core';
import {CanActivateFn, Router,} from '@angular/router';

import { AuthService } from '../services/auth-service';

/**
 * Keeps the MFA login page available only while this browser session has a
 * pending MFA challenge.
 */
export const mfaLoginGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasPendingMfaChallenge()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
