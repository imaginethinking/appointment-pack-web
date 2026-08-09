export interface AddressResponse {
  addressLine1: string;
  addressLine2: string | null;
  townCity: string;
  county: string | null;
  postcode: string;
  country: string;
}

export interface AddressRequest {
  addressLine1: string;
  addressLine2: string | null;
  townCity: string;
  county: string | null;
  postcode: string;
  country: string;
}

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
  address: AddressRequest | null;
}
