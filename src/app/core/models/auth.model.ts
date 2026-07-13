export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  profileId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  mfaRequired: boolean;
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
