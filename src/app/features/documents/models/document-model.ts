export const DOCUMENT_TYPES = [
  'APPOINTMENT_LETTER',
  'CONSULTATION_OUTCOME_LETTER',
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

export const DOCUMENT_STATUSES = [
  'UPLOADED',
  'EXTRACTING',
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
  'MANUAL',
] as const;

export type SummarySource = typeof SUMMARY_SOURCES[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  APPOINTMENT_LETTER: 'Appointment letter',
  CONSULTATION_OUTCOME_LETTER: 'Consultation outcome letter',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  UPLOADED: 'Awaiting processing',
  EXTRACTING: 'Extracting',
  READY_FOR_DEIDENTIFICATION_REVIEW: 'Awaiting de-identification review',
  SUMMARISING: 'Generating summary',
  READY_FOR_SUMMARY_REVIEW: 'Awaiting summary review',
  EXTRACTION_FAILED: 'Extraction failed',
  SUMMARISATION_FAILED: 'Summary unavailable',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export const SUMMARY_SOURCE_LABELS: Record<SummarySource, string> = {
  DETERMINISTIC: 'Deterministic',
  OPENAI: 'OpenAI',
  MANUAL: 'Manual',
};

export interface DocumentResponse {
  id: string;
  patientRecordId: string;
  documentType: DocumentType;
  status: DocumentStatus;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
}

export interface DocumentModelMetadata {
  name: string;
  promptVersion: string;
}

export interface DocumentProcessingResultResponse {
  documentId: string;
  documentType: DocumentType;
  status: DocumentStatus;
  extractedText: string;
  machineDeidentifiedText: string | null;
  approvedDeidentifiedText: string | null;
  generatedSummary: string | null;
  reviewedSummary: string | null;
  summarySource: SummarySource | null;
  processingWarning: string | null;
  processorVersion: string;
  model: DocumentModelMetadata | null;
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

export function getSummarySourceLabel(summarySource: SummarySource): string {
  return SUMMARY_SOURCE_LABELS[summarySource];
}

export function canExtractDocument(status: DocumentStatus): boolean {
  return status === 'UPLOADED' || status === 'EXTRACTION_FAILED';
}

export function canReviewDeidentifiedText(
  documentType: DocumentType,
  status: DocumentStatus,
): boolean {
  return (
    documentType === 'CONSULTATION_OUTCOME_LETTER' &&
    status === 'READY_FOR_DEIDENTIFICATION_REVIEW'
  );
}

export function canOpenSummaryReview(status: DocumentStatus): boolean {
  return (
    status === 'READY_FOR_SUMMARY_REVIEW' ||
    status === 'SUMMARISATION_FAILED'
  );
}

export function canArchiveDocument(status: DocumentStatus): boolean {
  return (
    status === 'UPLOADED' ||
    status === 'READY_FOR_DEIDENTIFICATION_REVIEW' ||
    status === 'READY_FOR_SUMMARY_REVIEW' ||
    status === 'EXTRACTION_FAILED' ||
    status === 'SUMMARISATION_FAILED' ||
    status === 'REJECTED'
  );
}

export function documentHasProcessingResult(status: DocumentStatus): boolean {
  return (
    status === 'READY_FOR_DEIDENTIFICATION_REVIEW' ||
    status === 'SUMMARISING' ||
    status === 'READY_FOR_SUMMARY_REVIEW' ||
    status === 'SUMMARISATION_FAILED' ||
    status === 'ACCEPTED' ||
    status === 'REJECTED'
  );
}
