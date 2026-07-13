import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  LoginRequest,
  LoginResponse,
  MfaConfirmRequest,
  MfaLoginRequest,
  MfaSetupResponse,
  RegisterRequest,
  RegisterResponse
} from '../models/auth-model';

interface JwtPayload {
  exp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;

  private readonly accessTokenKey = 'appointmentPack.accessToken'
  private readonly mfaChallengeIdKey = 'appointmentPack.mfaChallengeId'
  private readonly mfaEnabledKey = 'appointmentPack.mfaEnabled'

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.authUrl}/register`, request);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    this.clearSession()

    return this.http.post<LoginResponse>(`${this.authUrl}/login`, request)
      .pipe(tap(response => {
        this.handlePasswordLoginResponse(response);
      }))
  }

  completeMfaLogin(code: string): Observable<LoginResponse> {
    const mfaChallengeId = sessionStorage.getItem(this.mfaChallengeIdKey);

    if (mfaChallengeId === null) {
      return throwError(() => new Error('No MFA login challenge is pending.'));
    }

    const request: MfaLoginRequest = {
      mfaChallengeId,
      code
    };

    return this.http
      .post<LoginResponse>(`${this.authUrl}/login/mfa`, request)
      .pipe(
        tap((response) => {
          if (response.mfaRequired || response.accessToken === null || response.tokenType !== 'Bearer') {
            throw new Error('The server returned an invalid MFA login response.');
          }

          this.storeAuthenticatedSession(response.accessToken, true);
        })
      );
  }

  setupMfa(): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(`${this.authUrl}/mfa/setup`, null);
  }

  confirmMfa(code: string): Observable<void> {
    const request: MfaConfirmRequest = {
      code
    };

    return this.http
      .post<void>(`${this.authUrl}/mfa/confirm`, request)
      .pipe(
        tap(() => {
          sessionStorage.setItem(this.mfaEnabledKey, 'true');
        })
      );
  }

  getAccessToken(): string | null {
    const accessToken = sessionStorage.getItem(this.accessTokenKey);

    if (accessToken === null) {
      return null;
    }

    if (this.isTokenExpired(accessToken)) {
      this.clearSession();
      return null;
    }

    return accessToken;
  }

  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  hasPendingMfaChallenge(): boolean {
    return (sessionStorage.getItem(this.mfaChallengeIdKey) !== null);
  }

  isMfaEnabled(): boolean {
    return (sessionStorage.getItem(this.mfaEnabledKey) === 'true');
  }

  cancelMfaLogin(): void {
    this.clearSession();
  }

  logout(): void {
    this.clearSession();
  }

  private handlePasswordLoginResponse(
    response: LoginResponse): void {
    if (response.mfaRequired) {
      if (response.mfaChallengeId === null) {
        throw new Error('MFA is required, but the server did not return a challenge ID.');
      }

      if (response.accessToken !== null) {
        throw new Error('The server returned an access token before MFA was completed.');
      }

      sessionStorage.setItem(this.mfaChallengeIdKey, response.mfaChallengeId);

      sessionStorage.setItem(this.mfaEnabledKey, 'true');

      return;
    }

    if (response.accessToken === null || response.tokenType !== 'Bearer') {
      throw new Error('The server did not return a valid bearer access token.');
    }

    this.storeAuthenticatedSession(response.accessToken, false);
  }

  private storeAuthenticatedSession(accessToken: string, mfaEnabled: boolean): void {
    sessionStorage.setItem(this.accessTokenKey, accessToken);

    sessionStorage.setItem(this.mfaEnabledKey, String(mfaEnabled));

    sessionStorage.removeItem(this.mfaChallengeIdKey);
  }

  private clearSession(): void {
    sessionStorage.removeItem(this.accessTokenKey);
    sessionStorage.removeItem(this.mfaChallengeIdKey);
    sessionStorage.removeItem(this.mfaEnabledKey);
  }

  private isTokenExpired(accessToken: string): boolean {
    try {
      const tokenParts = accessToken.split('.');

      if (tokenParts.length !== 3) {
        return true;
      }

      const encodedPayload = tokenParts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      const paddedPayload = encodedPayload.padEnd(
        Math.ceil(encodedPayload.length / 4) * 4,
        '=',
      );

      const payload = JSON.parse(atob(paddedPayload)) as JwtPayload;

      if (typeof payload.exp !== 'number') {
        return true;
      }

      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

}
