export interface AddressRequest {
  addressLine1: string;
  addressLine2: string | null;
  townCity: string;
  county: string | null;
  postcode: string;
  country: string;
}

export interface PartialAddressRequest {
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
}

export interface AddressResponse {
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
}
