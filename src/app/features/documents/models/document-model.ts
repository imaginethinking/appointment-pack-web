export const DOCUMENT_TYPES = [
  'APPOINTMENT_LETTER',
  'CONSULTATION_OUTCOME_LETTER'
] as const;

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

export const SUMMARY_SOURCES = [
  'DETERMINISTIC',
  'OPENAI',
  'MANUAL'
] as const;

export type SummarySource = typeof SUMMARY_SOURCES[number];

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  APPOINTMENT_LETTER: 'Appointment letter',
  CONSULTATION_OUTCOME_LETTER: 'Consultation outcome letter',
};

const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  UPLOADED: 'Awaiting processing',
  EXTRACTING: 'Extracting',
  READY_FOR_APPOINTMENT_REVIEW: 'Awaiting appointment review',
  READY_FOR_DEIDENTIFICATION_REVIEW: 'Awaiting de-identification review',
  SUMMARISING: 'Generating summary',
  READY_FOR_SUMMARY_REVIEW: 'Awaiting summary review',
  EXTRACTION_FAILED: 'Extraction failed',
  SUMMARISATION_FAILED: 'Summary unavailable',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

const SUMMARY_SOURCE_LABELS: Record<SummarySource, string> = {
  DETERMINISTIC: 'Deterministic',
  OPENAI: 'OpenAI',
  MANUAL: 'Manual',
};

export interface DocumentResponse {
  id: string;
  patientRecordId: string;
  documentType: DocumentType;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  status: DocumentStatus;
  createdAt: string;
}

export interface DocumentModelMetadata {
  name: string;
  promptVersion: string;
}

export interface AppointmentAddressDetails {
  addressLine1: string | null;
  addressLine2: string | null;
  townCity: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
}

export interface AppointmentDetailsResponse {
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  service: string | null;
  appointmentType: string | null;
  clinicianOrTeam: string | null;
  locationName: string | null;
  address: AppointmentAddressDetails | null;
}

export interface DocumentProcessingResultResponse {
  documentId: string;
  documentType: DocumentType;
  status: DocumentStatus;

  extractedText: string;

  machineDeidentifiedText: string | null;
  approvedDeidentifiedText: string | null;

  appointmentDetails: AppointmentDetailsResponse | null;

  generatedSummary: string | null;
  reviewedSummary: string | null;

  summarySource: SummarySource | null;

  processingWarning: string | null;
  processorVersion: string;

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

export function getDocumentTypeLabel(documentType: DocumentType): string {
  return DOCUMENT_TYPE_LABELS[documentType];
}

export function getDocumentStatusLabel(status: DocumentStatus): string {
  return DOCUMENT_STATUS_LABELS[status];
}

export function getSummarySourceLabel(source: SummarySource): string {
  return SUMMARY_SOURCE_LABELS[source];
}

export function canExtractDocument(status: DocumentStatus): boolean {
  return status === 'UPLOADED' || status === 'EXTRACTION_FAILED';
}

export function canReviewAppointment(document: DocumentResponse): boolean {
  return (
    document.documentType === 'APPOINTMENT_LETTER' &&
    document.status === 'READY_FOR_APPOINTMENT_REVIEW'
  );
}

export function canReviewDeidentifiedText(document: DocumentResponse): boolean {
  return (
    document.documentType === 'CONSULTATION_OUTCOME_LETTER' &&
    document.status === 'READY_FOR_DEIDENTIFICATION_REVIEW'
  );
}

export function canOpenSummaryReview(status: DocumentStatus): boolean {
  return status === 'READY_FOR_SUMMARY_REVIEW' || status === 'SUMMARISATION_FAILED';
}

export function canArchiveDocument(status: DocumentStatus): boolean {
  return (
    status === 'UPLOADED' ||
    status === 'READY_FOR_APPOINTMENT_REVIEW' ||
    status === 'READY_FOR_DEIDENTIFICATION_REVIEW' ||
    status === 'READY_FOR_SUMMARY_REVIEW' ||
    status === 'EXTRACTION_FAILED' ||
    status === 'SUMMARISATION_FAILED' ||
    status === 'REJECTED'
  );
}

export function documentHasProcessingResult(status: DocumentStatus): boolean {
  return (
    status === 'READY_FOR_APPOINTMENT_REVIEW' ||
    status === 'READY_FOR_DEIDENTIFICATION_REVIEW' ||
    status === 'SUMMARISING' ||
    status === 'READY_FOR_SUMMARY_REVIEW' ||
    status === 'SUMMARISATION_FAILED' ||
    status === 'ACCEPTED' ||
    status === 'REJECTED'
  );
}
