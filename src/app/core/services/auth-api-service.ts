import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  EmailVerificationConfirmRequest,
  EmailVerificationResendRequest,
  LoginRequest,
  LoginResponse,
  MfaConfirmRequest,
  MfaLoginRequest,
  MfaSetupResponse,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  RegisterRequest,
  RegisterResponse,
} from '../models/auth-model';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly authUrl = `${environment.apiBaseUrl}/auth`;

  register(request: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.authUrl}/register`, request);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login`, request);
  }

  completeMfaLogin(request: MfaLoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}/login/mfa`, request);
  }

  resendEmailVerification(request: EmailVerificationResendRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/email-verification/resend`, request);
  }

  confirmEmailVerification(request: EmailVerificationConfirmRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/email-verification/confirm`, request);
  }

  requestPasswordReset(request: PasswordResetRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/password-reset/request`, request);
  }

  confirmPasswordReset(request: PasswordResetConfirmRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/password-reset/confirm`, request);
  }

  setupMfa(): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(`${this.authUrl}/mfa/setup`, null);
  }

  confirmMfa(request: MfaConfirmRequest): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/mfa/confirm`, request);
  }
}
