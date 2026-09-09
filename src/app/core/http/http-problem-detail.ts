import {HttpErrorResponse} from '@angular/common/http';

/**
 * Holds the structured error information returned by a failed HTTP request.
 */
export interface HttpProblemDetail {
  type: string | null;
  title: string | null;
  status: number;
  detail: string | null;
  instance: string | null;
  fieldErrors: Readonly<Record<string, string>>;
}

/**
 * Reads structured error information from an HTTP error response.
 */
export function getHttpProblemDetail(error: unknown): HttpProblemDetail | null {
  if (!(error instanceof HttpErrorResponse) || !isRecord(error.error)) {
    return null;
  }

  return {
    type: getString(error.error['type']),
    title: getString(error.error['title']),
    status: error.status,
    detail: getString(error.error['detail']),
    instance: getString(error.error['instance']),
    fieldErrors: getStringRecord(error.error['fieldErrors'])
  }
}

/**
 * Returns any field validation errors included in an HTTP error response.
 */
export function getHttpFieldErrors(error: unknown): Readonly<Record<string, string>> {
  return getHttpProblemDetail(error)?.fieldErrors ?? {};
}

/**
 * Checks whether an error is an HTTP response with the requested status.
 */
export function hasHttpStatus(error: unknown, status: number): boolean {
  return error instanceof HttpErrorResponse && error.status === status;
}

/**
 * Returns a non empty string value or null when the value cannot be used.
 */
export function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/**
 * Keeps the non empty string values from an object.
 */
function getStringRecord(value: unknown): Readonly<Record<string, string>> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, fieldError] of Object.entries(value)) {
    if (typeof fieldError === 'string' && fieldError.trim().length > 0) {
      result[key] = fieldError;
    }
  }

  return result;
}

/**
 * Checks whether a value can be safely read as an object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
