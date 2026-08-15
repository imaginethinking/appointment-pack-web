import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth-service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authUrl = `${environment.apiBaseUrl}/auth`;

  const publicAuthUrls = [
    `${authUrl}/register`,
    `${authUrl}/login`,
    `${authUrl}/login/mfa`,
    `${authUrl}/email-verification/resend`,
    `${authUrl}/email-verification/confirm`,
    `${authUrl}/password-reset/request`,
    `${authUrl}/password-reset/confirm`,
  ];

  const isApiRequest = request.url.startsWith(environment.apiBaseUrl);
  const isPublicAuthRequest = publicAuthUrls.includes(request.url);
  const accessToken = isApiRequest && !isPublicAuthRequest ? authService.getAccessToken() : null;

  const authenticatedRequest = accessToken === null
    ? request
    : request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiRequest && !isPublicAuthRequest) {
        authService.logout();
        void router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
