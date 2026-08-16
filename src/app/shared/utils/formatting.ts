import { AddressResponse } from '../models/address-model';

export function formatEnumLabel(value: string | null, emptyLabel = 'Not provided'): string {
  if (value === null || value.trim().length === 0) {
    return emptyLabel;
  }

  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatFileSize(fileSize: number): string {
  if (fileSize < 1024) {
    return `${fileSize} B`;
  }

  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatLocalTime(value: string): string {
  return value.length < 5 ? value : value.substring(0, 5);
}

export function formatAddressLines(address: AddressResponse | null): string[] {
  if (address === null) {
    return [];
  }

  return [
    address.addressLine1,
    address.addressLine2,
    address.townCity,
    address.county,
    address.postcode,
    address.country,
  ].filter((value): value is string => value !== null && value.trim().length > 0);
}

export function normaliseOptionalText(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
}
