import {HttpErrorResponse} from '@angular/common/http';

export interface HttpProblemDetail {
  type: string | null;
  title: string | null;
  status: number;
  detail: string | null;
  instance: string | null;
  fieldErrors: Readonly<Record<string, string>>;
}

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

export function getHttpFieldErrors(error: unknown): Readonly<Record<string, string>> {
  return getHttpProblemDetail(error)?.fieldErrors ?? {};
}

export function hasHttpStatus(error: unknown, status: number): boolean {
  return error instanceof HttpErrorResponse && error.status === status;
}

export function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
