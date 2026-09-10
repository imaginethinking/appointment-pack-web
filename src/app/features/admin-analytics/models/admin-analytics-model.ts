import {ApplicationPage} from '../../../core/models/application-page-model';
import {PatientActivityAction, PatientResourceType} from '../../audit/models/patient-audit-model';
import {DocumentType} from '../../documents/models/document-model';

export const OPERATIONAL_EVENT_CATEGORIES = [
  'PATIENT_ACTIVITY',
  'AUTHENTICATION',
  'DOCUMENT_PROCESSING',
  'PAGE_VIEW',
] as const;

export type OperationalEventCategory = typeof OPERATIONAL_EVENT_CATEGORIES[number];

export const AUTHENTICATION_ACTIONS = [
  'REGISTRATION',
  'EMAIL_VERIFICATION',
  'PASSWORD_RESET',
  'PASSWORD_CHANGE',
  'LOGIN',
  'MFA_SETUP',
  'MFA_DISABLE',
  'MFA_CHALLENGE',
  'MFA_LOGIN',
] as const;

export type AuthenticationAction = typeof AUTHENTICATION_ACTIONS[number];

export const AUTHENTICATION_OUTCOMES = [
  'REQUESTED',
  'RESENT',
  'STARTED',
  'CREATED',
  'SUCCEEDED',
  'FAILED',
  'BLOCKED',
  'ENABLED',
  'DISABLED',
  'MFA_REQUIRED',
] as const;

export type AuthenticationOutcome = typeof AUTHENTICATION_OUTCOMES[number];

export const DOCUMENT_PROCESSING_OPERATIONS = [
  'EXTRACTION',
  'AI_SUMMARISATION',
] as const;

export type DocumentProcessingOperation = typeof DOCUMENT_PROCESSING_OPERATIONS[number];

export const PROCESSING_OUTCOMES = [
  'SUCCEEDED',
  'FAILED',
] as const;

export type ProcessingOutcome = typeof PROCESSING_OUTCOMES[number];

export const DOCUMENT_PROCESSING_FAILURE_REASONS = [
  'TIMEOUT',
  'SERVICE_UNAVAILABLE',
  'PROCESSING_ERROR',
  'UNKNOWN',
] as const;

export type DocumentProcessingFailureReason = typeof DOCUMENT_PROCESSING_FAILURE_REASONS[number];

export interface AdminAnalyticsSummaryResponse {
  from: string;
  to: string;
  totalOperationalEvents: number;
  users: UserMetrics;
  authentication: AuthenticationMetrics;
  documentProcessing: DocumentProcessingMetrics;
  patientActivity: PatientActivityMetrics;
  pageViews: PageViewMetrics;
}

export interface UserMetrics {
  totalUsers: number;
  registeredInPeriod: number;
  activeUsersInPeriod: number;
}

export interface AuthenticationMetrics {
  loginAttempts: number;
  authenticatedSessions: number;
  passwordLoginSucceeded: number;
  loginFailed: number;
  loginBlocked: number;
  mfaRequired: number;
  mfaChallengesCreated: number;
  mfaLoginSucceeded: number;
  mfaLoginFailed: number;
  mfaSetupEnabled: number;
  emailVerificationRequested: number;
  emailVerificationResent: number;
  emailVerificationSucceeded: number;
  emailVerificationFailed: number;
  passwordResetRequested: number;
  passwordResetSucceeded: number;
  passwordResetFailed: number;
}

export interface DocumentProcessingMetrics {
  extractionSucceeded: number;
  extractionFailed: number;
  averageSuccessfulExtractionDurationMs: number | null;
  aiSummarisationSucceeded: number;
  aiSummarisationFailed: number;
  averageSuccessfulAiSummarisationDurationMs: number | null;
  timeoutFailures: number;
  serviceUnavailableFailures: number;
  processingErrorFailures: number;
  unknownFailures: number;
}

export interface PatientActivityMetrics {
  total: number;
  breakdown: PatientActivityCount[];
}

export interface PatientActivityCount {
  resourceType: PatientResourceType;
  action: PatientActivityAction;
  count: number;
}

export interface PageViewMetrics {
  total: number;
  breakdown: PageViewCount[];
}

export interface PageViewCount {
  page: ApplicationPage;
  count: number;
}

export interface OperationalEventResponse {
  id: string;
  category: OperationalEventCategory;
  eventName: string;
  userId: string | null;
  occurredAt: string;
  patientResourceType: PatientResourceType | null;
  patientAction: PatientActivityAction | null;
  authenticationAction: AuthenticationAction | null;
  authenticationOutcome: AuthenticationOutcome | null;
  documentType: DocumentType | null;
  processingOperation: DocumentProcessingOperation | null;
  processingOutcome: ProcessingOutcome | null;
  processingFailureReason: DocumentProcessingFailureReason | null;
  durationMs: number | null;
  processorVersion: string | null;
  modelName: string | null;
  promptVersion: string | null;
  page: ApplicationPage | null;
}

export interface OperationalEventPageResponse {
  events: OperationalEventResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AnalyticsRangeQuery {
  from?: string;
  to?: string;
}

export interface OperationalEventQuery extends AnalyticsRangeQuery {
  category?: OperationalEventCategory;
  page: number;
  size: number;
}

/**
 * Returns the display name for an operational event category.
 */
export function getOperationalEventCategoryLabel(category: OperationalEventCategory): string {
  switch (category) {
    case 'PATIENT_ACTIVITY':
      return 'Patient activity';
    case 'AUTHENTICATION':
      return 'Authentication';
    case 'DOCUMENT_PROCESSING':
      return 'Document processing';
    case 'PAGE_VIEW':
      return 'Page view';
  }
}
