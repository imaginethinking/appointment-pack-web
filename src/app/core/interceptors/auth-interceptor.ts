import {HttpErrorResponse, HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {Router} from '@angular/router';
import {catchError, throwError} from 'rxjs';

import {environment} from '../../../environments/environment';
import {AuthService} from '../services/auth-service';

/**
 * Adds the current access token to protected API requests and clears the
 * browser session when a protected request receives an unexpected 401.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authUrl = `${environment.apiBaseUrl}/auth`;
  const pageViewsUrl = `${environment.apiBaseUrl}/analytics/page-views`;

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
  const isOptionalAuthenticationRequest = request.url === pageViewsUrl;
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
      if (
        error.status === 401
        && isApiRequest
        && !isPublicAuthRequest
        && !isOptionalAuthenticationRequest
      ) {
        authService.logout();
        void router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};
