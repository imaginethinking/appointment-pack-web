import { HttpErrorResponse } from '@angular/common/http';

import { getHttpProblemDetail } from './http-problem-detail';

export function getHttpErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to connect to the server.';
    }

    if (typeof error.error === 'string' && error.error.trim().length > 0) {
      return error.error;
    }

    const problemDetail = getHttpProblemDetail(error);

    if (problemDetail?.detail != null) {
      return problemDetail.detail;
    }

    if (isRecord(error.error)) {
      const message = error.error['message'];

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }

      const generalError = error.error['error'];

      if (typeof generalError === 'string' && generalError.trim().length > 0) {
        return generalError;
      }
    }

    return `${fallbackMessage} HTTP status: ${error.status}.`;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
