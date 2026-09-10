import {AddressResponse} from '../models/address-model';

/**
 * Converts an enum value into a readable label for display.
 */
export function formatEnumLabel(value: string | null, emptyLabel = 'Not provided'): string {
  if (value === null || value.trim().length === 0) {
    return emptyLabel;
  }

  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Formats a file size in bytes KB or MB depending on its size.
 */
export function formatFileSize(fileSize: number): string {
  if (fileSize < 1024) {
    return `${fileSize} B`;
  }

  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)} KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats a time value using hours and minutes.
 */
export function formatLocalTime(value: string): string {
  return value.length < 5 ? value : value.substring(0, 5);
}

/**
 * Returns the completed parts of an address in display order.
 */
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

/**
 * Trims optional text and returns null when nothing has been entered.
 */
export function normaliseOptionalText(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? null : trimmedValue;
}
