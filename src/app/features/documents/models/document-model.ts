import { AddressResponse } from '../../../shared/models/address-model';

export const DOCUMENT_TYPES = ['APPOINTMENT_LETTER', 'CONSULTATION_OUTCOME_LETTER'] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

export const DOCUMENT_STATUSES = [
  'UPLOADED',
  'EXTRACTING',
  'READY_FOR_APPOINTMENT_REVIEW',
  'READY_FOR_DEIDENTIFICATION_REVIEW',
  'SUMMARISING',
  'READY_FOR_SUMMARY_REVIEW',
  'EXTRACTION_FAILED',
  'SUMMARISATION_FAILED',
  'ACCEPTED',
  'REJECTED',
  'ARCHIVED',
] as const;
export type DocumentStatus = typeof DOCUMENT_STATUSES[number];

export const DOCUMENT_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export type DocumentContentType = typeof DOCUMENT_CONTENT_TYPES[number];

export const SUMMARY_SOURCES = ['DETERMINISTIC', 'OPENAI', 'MANUAL'] as const;
export type SummarySource = typeof SUMMARY_SOURCES[number];

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  APPOINTMENT_LETTER: 'Appointment letter',
  CONSULTATION_OUTCOME_LETTER: 'Consultation outcome letter',
};

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  UPLOADED: 'Ready to process',
  EXTRACTING: 'Processing',
  READY_FOR_APPOINTMENT_REVIEW: 'Ready for appointment review',
  READY_FOR_DEIDENTIFICATION_REVIEW: 'Ready for privacy review',
  SUMMARISING: 'Preparing summary',
  READY_FOR_SUMMARY_REVIEW: 'Ready for summary review',
  EXTRACTION_FAILED: 'Processing failed',
  SUMMARISATION_FAILED: 'Summary generation failed',
  ACCEPTED: 'Completed',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

const SUMMARY_SOURCE_LABELS: Record<SummarySource, string> = {
  DETERMINISTIC: 'Automatically generated',
  OPENAI: 'AI-assisted',
  MANUAL: 'Entered manually',
};

/**
 * Contains the processing information and review results for a document.
 */
export interface DocumentResponse {
  id: string;
  patientRecordId: string;
  documentType: DocumentType;
  status: DocumentStatus;
  originalFileName: string;
  contentType: DocumentContentType;
  fileSize: number;
  createdAt: string;
}

/**
 * Contains the model and prompt details recorded for a generated summary.
 */
export interface DocumentModelMetadata {
  name: string;
  promptVersion: string;
}

export interface AppointmentDetailsResponse {
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  service: string | null;
  appointmentType: string | null;
  clinicianOrTeam: string | null;
  locationName: string | null;
  address: AddressResponse | null;
}

export interface DocumentProcessingResultResponse {
  documentId: string;
  documentType: DocumentType;
  status: DocumentStatus;
  extractedText: string | null;
  machineDeidentifiedText: string | null;
  approvedDeidentifiedText: string | null;
  appointmentDetails: AppointmentDetailsResponse | null;
  generatedSummary: string | null;
  reviewedSummary: string | null;
  summarySource: SummarySource | null;
  processingWarning: string | null;
  processorVersion: string | null;
  model: DocumentModelMetadata | null;
  appointmentReviewedByUserId: string | null;
  appointmentReviewedAt: string | null;
  deidentificationReviewedByUserId: string | null;
  deidentificationReviewedAt: string | null;
  summaryReviewedByUserId: string | null;
  summaryReviewedAt: string | null;
}

export interface DocumentSummarisationRequest {
  approvedDeidentifiedText: string;
}

export interface DocumentSummaryAcceptanceRequest {
  reviewedSummary: string;
  historyTitle: string;
  historyDate: string;
}

/**
 * Returns the display name for a document type.
 */
export function getDocumentTypeLabel(documentType: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[documentType];
}

/**
 * Returns the text shown for a document status.
 */
export function getDocumentStatusLabel(status: DocumentStatus): string {
  return DOCUMENT_STATUS_LABELS[status];
}

/**
 * Returns the display name for the source of a consultation summary.
 */
export function getSummarySourceLabel(source: SummarySource): string {
  return SUMMARY_SOURCE_LABELS[source];
}

/**
 * Checks whether a document can currently be processed or retried.
 */
export function canExtractDocument(status: DocumentStatus): boolean {
  return status === 'UPLOADED' || status === 'EXTRACTION_FAILED';
}

/**
 * Checks whether an appointment letter is ready for its appointment details to be reviewed.
 */
export function canReviewAppointment(document: DocumentResponse): boolean {
  return document.documentType === 'APPOINTMENT_LETTER' && document.status === 'READY_FOR_APPOINTMENT_REVIEW';
}

/**
 * Checks whether a consultation letter is ready for privacy review.
 */
export function canReviewDeidentifiedText(document: DocumentResponse): boolean {
  return document.documentType === 'CONSULTATION_OUTCOME_LETTER' && document.status === 'READY_FOR_DEIDENTIFICATION_REVIEW';
}

/**
 * Checks whether the consultation summary page can be opened for the current status.
 */
export function canOpenSummaryReview(status: DocumentStatus): boolean {
  return status === 'READY_FOR_SUMMARY_REVIEW' || status === 'SUMMARISATION_FAILED';
}

/**
 * Checks whether a document has reached a state where it can be archived.
 */
export function canArchiveDocument(status: DocumentStatus): boolean {
  return [
    'UPLOADED',
    'READY_FOR_APPOINTMENT_REVIEW',
    'READY_FOR_DEIDENTIFICATION_REVIEW',
    'READY_FOR_SUMMARY_REVIEW',
    'EXTRACTION_FAILED',
    'SUMMARISATION_FAILED',
    'REJECTED',
    'ACCEPTED',
  ].includes(status);
}

/**
 * Checks whether processing information should be available for the document.
 */
export function documentHasProcessingResult(status: DocumentStatus): boolean {
  return [
    'READY_FOR_APPOINTMENT_REVIEW',
    'READY_FOR_DEIDENTIFICATION_REVIEW',
    'SUMMARISING',
    'READY_FOR_SUMMARY_REVIEW',
    'SUMMARISATION_FAILED',
    'ACCEPTED',
    'REJECTED',
  ].includes(status);
}
