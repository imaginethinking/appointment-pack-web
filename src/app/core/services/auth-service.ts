import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap, throwError } from 'rxjs';

import { LoginRequest, LoginResponse, MfaLoginRequest, MfaSetupResponse, UserRole } from '../models/auth-model';
import { AuthApiService } from './auth-api-service';

interface JwtPayload {
  exp?: number;
  roles?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authApi = inject(AuthApiService);

  private readonly accessTokenKey = 'appointmentPack.accessToken';
  private readonly mfaChallengeIdKey = 'appointmentPack.mfaChallengeId';
  private readonly mfaEnabledKey = 'appointmentPack.mfaEnabled';

  private readonly authenticatedValue = signal(false);
  private readonly rolesValue = signal<ReadonlySet<UserRole>>(new Set());

  readonly authenticated = this.authenticatedValue.asReadonly();
  readonly roles = this.rolesValue.asReadonly();
  readonly isAdmin = computed(() => this.rolesValue().has('ADMIN'));

  constructor() {
    this.restoreAuthenticatedSession();
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    this.clearSession();

    return this.authApi.login(request).pipe(
      tap((response) => this.handlePasswordLoginResponse(response)),
    );
  }

  completeMfaLogin(code: string): Observable<LoginResponse> {
    const mfaChallengeId = sessionStorage.getItem(this.mfaChallengeIdKey);

    if (mfaChallengeId === null) {
      return throwError(() => new Error('No MFA login challenge is pending.'));
    }

    const request: MfaLoginRequest = {
      mfaChallengeId,
      code,
    };

    return this.authApi.completeMfaLogin(request).pipe(
      tap((response) => this.handleMfaLoginResponse(response)),
    );
  }

  setupMfa(): Observable<MfaSetupResponse> {
    return this.authApi.setupMfa();
  }

  confirmMfa(code: string): Observable<void> {
    return this.authApi.confirmMfa({ code }).pipe(
      tap(() => sessionStorage.setItem(this.mfaEnabledKey, 'true')),
    );
  }

  getAccessToken(): string | null {
    const accessToken = sessionStorage.getItem(this.accessTokenKey);

    if (accessToken === null) {
      return null;
    }

    const payload = this.decodeJwtPayload(accessToken);

    if (payload === null || this.isPayloadExpired(payload)) {
      this.clearSession();
      return null;
    }

    this.updateAuthenticatedState(payload);
    return accessToken;
  }

  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  hasRole(role: UserRole): boolean {
    return this.rolesValue().has(role);
  }

  hasPendingMfaChallenge(): boolean {
    return sessionStorage.getItem(this.mfaChallengeIdKey) !== null;
  }

  isMfaEnabled(): boolean {
    return sessionStorage.getItem(this.mfaEnabledKey) === 'true';
  }

  cancelMfaLogin(): void {
    this.clearSession();
  }

  logout(): void {
    this.clearSession();
  }

  private handlePasswordLoginResponse(response: LoginResponse): void {
    switch (response.status) {
      case 'AUTHENTICATED':
        if (response.accessToken === null || response.tokenType !== 'Bearer' || response.mfaChallengeId !== null) {
          throw new Error('The server returned an invalid authenticated login response.');
        }

        this.storeAuthenticatedSession(response.accessToken, false);
        return;

      case 'EMAIL_VERIFICATION_REQUIRED':
        if (response.accessToken !== null || response.tokenType !== null || response.mfaChallengeId !== null) {
          throw new Error('The server returned an invalid email-verification login response.');
        }

        return;

      case 'MFA_REQUIRED':
        if (response.mfaChallengeId === null || response.accessToken !== null || response.tokenType !== null) {
          throw new Error('The server returned an invalid MFA login response.');
        }

        sessionStorage.setItem(this.mfaChallengeIdKey, response.mfaChallengeId);
        sessionStorage.setItem(this.mfaEnabledKey, 'true');
        return;
    }
  }

  private handleMfaLoginResponse(response: LoginResponse): void {
    if (
      response.status !== 'AUTHENTICATED'
      || response.accessToken === null
      || response.tokenType !== 'Bearer'
      || response.mfaChallengeId !== null
    ) {
      throw new Error('The server returned an invalid MFA login completion response.');
    }

    this.storeAuthenticatedSession(response.accessToken, true);
  }

  private storeAuthenticatedSession(accessToken: string, mfaEnabled: boolean): void {
    const payload = this.decodeJwtPayload(accessToken);

    if (payload === null || this.isPayloadExpired(payload)) {
      throw new Error('The server returned an invalid access token.');
    }

    sessionStorage.setItem(this.accessTokenKey, accessToken);
    sessionStorage.setItem(this.mfaEnabledKey, String(mfaEnabled));
    sessionStorage.removeItem(this.mfaChallengeIdKey);

    this.updateAuthenticatedState(payload);
  }

  private restoreAuthenticatedSession(): void {
    const accessToken = sessionStorage.getItem(this.accessTokenKey);

    if (accessToken === null) {
      return;
    }

    const payload = this.decodeJwtPayload(accessToken);

    if (payload === null || this.isPayloadExpired(payload)) {
      this.clearSession();
      return;
    }

    this.updateAuthenticatedState(payload);
  }

  private updateAuthenticatedState(payload: JwtPayload): void {
    const roles = Array.isArray(payload.roles) ? payload.roles.filter(isUserRole) : [];

    this.rolesValue.set(new Set(roles));
    this.authenticatedValue.set(true);
  }

  private clearSession(): void {
    sessionStorage.removeItem(this.accessTokenKey);
    sessionStorage.removeItem(this.mfaChallengeIdKey);
    sessionStorage.removeItem(this.mfaEnabledKey);

    this.rolesValue.set(new Set());
    this.authenticatedValue.set(false);
  }

  private decodeJwtPayload(accessToken: string): JwtPayload | null {
    try {
      const tokenParts = accessToken.split('.');

      if (tokenParts.length !== 3) {
        return null;
      }

      const encodedPayload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
      const payload = JSON.parse(atob(paddedPayload)) as JwtPayload;

      return typeof payload.exp === 'number' ? payload : null;
    } catch {
      return null;
    }
  }

  private isPayloadExpired(payload: JwtPayload): boolean {
    return payload.exp === undefined || payload.exp * 1000 <= Date.now();
  }
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'USER' || value === 'ADMIN';
}
