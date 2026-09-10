import {computed, inject, Injectable, signal} from '@angular/core';
import {Observable, tap, throwError} from 'rxjs';

import {
  AccountSecurityResponse,
  LoginRequest,
  LoginResponse,
  MfaLoginRequest,
  MfaSetupResponse,
  PasswordChangeRequest,
  UserRole,
} from '../models/auth-model';
import {AuthApiService} from './auth-api-service';

interface JwtPayload {
  exp?: number;
  roles?: unknown;
}

/**
 * Maintains browser-side authentication state, including the access token,
 * supported roles and any pending MFA login challenge.
 *
 * JWT contents are decoded only for frontend session and navigation state.
 * The backend remains responsible for validating the token.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly authApi = inject(AuthApiService);

  private readonly accessTokenKey = 'appointmentPack.accessToken';
  private readonly mfaChallengeIdKey = 'appointmentPack.mfaChallengeId';

  private readonly authenticatedValue = signal(false);
  private readonly rolesValue = signal<ReadonlySet<UserRole>>(new Set());

  readonly authenticated = this.authenticatedValue.asReadonly();
  readonly roles = this.rolesValue.asReadonly();
  readonly isAdmin = computed(() => this.rolesValue().has('ADMIN'));

  /**
   * Restores a valid authenticated session from browser storage when the
   * service is created.
   */
  constructor() {
    this.restoreAuthenticatedSession();
  }

  /**
   * Starts a password login after clearing any authentication state left from
   * the previous session or login attempt.
   */
  login(request: LoginRequest): Observable<LoginResponse> {
    this.clearSession();

    return this.authApi.login(request).pipe(
      tap((response) => this.handlePasswordLoginResponse(response)),
    );
  }

  /**
   * Completes the pending MFA login using the challenge stored for the current
   * browser session.
   */
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

  /**
   * Loads the current account security settings from the backend.
   */
  getAccountSecurity(): Observable<AccountSecurityResponse> {
    return this.authApi.getAccountSecurity();
  }

  /**
   * Changes the current user's password using the supplied current and new
   * password details.
   */
  changePassword(request: PasswordChangeRequest): Observable<void> {
    return this.authApi.changePassword(request);
  }

  /**
   * Starts MFA setup and returns the provisioning details required by the user.
   */
  setupMfa(): Observable<MfaSetupResponse> {
    return this.authApi.setupMfa();
  }

  /**
   * Confirms the pending MFA setup using a current authenticator code.
   */
  confirmMfa(code: string): Observable<void> {
    return this.authApi.confirmMfa({ code });
  }

  /**
   * Disables MFA after the backend verifies the supplied authenticator code.
   */
  disableMfa(code: string): Observable<void> {
    return this.authApi.disableMfa({ code });
  }

  /**
   * Returns the stored access token when it is structurally valid and has not
   * expired, clears stale session state otherwise.
   *
   * @returns The current access token, or null when no usable token is stored.
   */
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

  /**
   * Checks whether the browser session currently contains a usable access token.
   */
  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  /**
   * Checks whether the roles decoded for the current frontend session include
   * the requested role.
   */
  hasRole(role: UserRole): boolean {
    return this.rolesValue().has(role);
  }

  /**
   * Checks whether an MFA login challenge is waiting to be completed in this
   * browser session.
   */
  hasPendingMfaChallenge(): boolean {
    return sessionStorage.getItem(this.mfaChallengeIdKey) !== null;
  }

  /**
   * Cancels the pending MFA login and clears authentication state for the
   * current browser session.
   */
  cancelMfaLogin(): void {
    this.clearSession();
  }

  /**
   * Clears the current browser authentication state.
   */
  logout(): void {
    this.clearSession();
  }

  /**
   * Validates the password login response before storing either an authenticated
   * session or a pending MFA challenge.
   */
  private handlePasswordLoginResponse(response: LoginResponse): void {
    switch (response.status) {
      case 'AUTHENTICATED':
        if (response.accessToken === null || response.tokenType !== 'Bearer' || response.mfaChallengeId !== null) {
          throw new Error('The server returned an invalid authenticated login response.');
        }

        this.storeAuthenticatedSession(response.accessToken);
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
        return;
    }
  }

  /**
   * Accepts only a completed authenticated MFA response before storing the
   * returned access token.
   */
  private handleMfaLoginResponse(response: LoginResponse): void {
    if (
      response.status !== 'AUTHENTICATED'
      || response.accessToken === null
      || response.tokenType !== 'Bearer'
      || response.mfaChallengeId !== null
    ) {
      throw new Error('The server returned an invalid MFA login completion response.');
    }

    this.storeAuthenticatedSession(response.accessToken);
  }

  /**
   * Validates and stores an access token, clears any completed MFA challenge
   * and updates the reactive authentication state.
   */
  private storeAuthenticatedSession(accessToken: string): void {
    const payload = this.decodeJwtPayload(accessToken);

    if (payload === null || this.isPayloadExpired(payload)) {
      throw new Error('The server returned an invalid access token.');
    }

    sessionStorage.setItem(this.accessTokenKey, accessToken);
    sessionStorage.removeItem(this.mfaChallengeIdKey);

    this.updateAuthenticatedState(payload);
  }

  /**
   * Restores reactive authentication state when browser storage contains a
   * valid, unexpired access token.
   */
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

  /**
   * Removes stored authentication and MFA state and resets the corresponding
   * reactive values.
   */
  private clearSession(): void {
    sessionStorage.removeItem(this.accessTokenKey);
    sessionStorage.removeItem(this.mfaChallengeIdKey);

    this.rolesValue.set(new Set());
    this.authenticatedValue.set(false);
  }

  /**
   * Decodes the JWT payload for frontend expiry and role state.
   */
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

  /**
   * Checks whether the decoded token expiry has passed or is missing.
   */
  private isPayloadExpired(payload: JwtPayload): boolean {
    return payload.exp === undefined || payload.exp * 1000 <= Date.now();
  }
}

/**
 * Narrows a decoded role value to one of the roles understood by the frontend.
 */
function isUserRole(value: unknown): value is UserRole {
  return value === 'USER' || value === 'ADMIN';
}
