import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';

import {AuthService} from '../services/auth-service';

/**
 * Allows users with the frontend admin role to continue and redirects other
 * users to the access denied page.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAdmin() ? true : router.createUrlTree(['/access-denied']);
};
