import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../environments/environment';
import {
  AccountSecurityResponse,
  EmailVerificationConfirmRequest,
  EmailVerificationResendRequest,
  LoginRequest,
  LoginResponse,
  MfaConfirmRequest,
  MfaLoginRequest,
  MfaSetupResponse,
  PasswordChangeRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RegisterRequest,
  RegisterResponse,
} from '../models/auth-model';

/**
 * Provides the frontend HTTP operations for authentication and account
 * security workflows.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;

  /**
   * Registers a new account using the supplied profile and authentication data.
   */
  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.authUrl}/register`, request);
  }

  /**
   * Submits the user's password login credentials and returns the resulting
   * authentication state.
   */
  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, request);
  }

  /**
   * Completes an MFA login challenge using the supplied authenticator code.
   */
  completeMfaLogin(request: MfaLoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login/mfa`, request);
  }

  /**
   * Requests another verification email for the supplied account.
   */
  resendEmailVerification(request: EmailVerificationResendRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/email-verification/resend`, request);
  }

  /**
   * Confirms an email address using the supplied verification token.
   */
  confirmEmailVerification(request: EmailVerificationConfirmRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/email-verification/confirm`, request);
  }

  /**
   * Requests a password reset message for the supplied account.
   */
  requestPasswordReset(request: PasswordResetRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/password-reset/request`, request);
  }

  /**
   * Completes a password reset using the supplied reset token and new password.
   */
  confirmPasswordReset(request: PasswordResetConfirmRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/password-reset/confirm`, request);
  }

  /**
   * Loads the backend's current account security state for the authenticated user.
   */
  getAccountSecurity(): Observable<AccountSecurityResponse> {
    return this.http.get<AccountSecurityResponse>(`${this.authUrl}/security`);
  }

  /**
   * Sends an authenticated password change request to the backend.
   */
  changePassword(request: PasswordChangeRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/password/change`, request);
  }

  /**
   * Starts MFA setup for the authenticated account.
   */
  setupMfa(): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(`${this.authUrl}/mfa/setup`, null);
  }

  /**
   * Confirms the pending MFA setup with an authenticator code.
   */
  confirmMfa(request: MfaConfirmRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/mfa/confirm`, request);
  }

  /**
   * Disables MFA after submitting a current authenticator code.
   */
  disableMfa(request: MfaConfirmRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/mfa/disable`, request);
  }
}
