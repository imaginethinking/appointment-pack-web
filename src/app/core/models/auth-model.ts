export const LOGIN_STATUSES = ['AUTHENTICATED', 'EMAIL_VERIFICATION_REQUIRED', 'MFA_REQUIRED'] as const;
export type LoginStatus = typeof LOGIN_STATUSES[number];

export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = typeof USER_ROLES[number];

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export interface RegisterResponse {
  id: string;
  email: string;
  profileId: string;
  emailVerificationRequired: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: LoginStatus;
  mfaChallengeId: string | null;
  accessToken: string | null;
  tokenType: 'Bearer' | null;
}

export interface MfaLoginRequest {
  mfaChallengeId: string;
  code: string;
}

export interface MfaSetupResponse {
  provisioningUri: string;
}

export interface MfaConfirmRequest {
  code: string;
}

export interface EmailVerificationResendRequest {
  email: string;
}

export interface EmailVerificationConfirmRequest {
  token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
