export type AddressResponse = Record<string, unknown>;

export interface ProfileResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
  address: AddressResponse | null;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
}
