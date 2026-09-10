import {DocumentType} from '../../documents/models/document-model';

export const MEDICAL_HISTORY_SOURCE_TYPES = ['DOCUMENT_SUMMARY', 'MANUAL'] as const;
export type MedicalHistorySourceType = typeof MEDICAL_HISTORY_SOURCE_TYPES[number];

export interface MedicalHistoryEntryRequest {
  title: string;
  summary: string;
  entryDate: string;
}

export type CreateMedicalHistoryEntryRequest = MedicalHistoryEntryRequest;
export type UpdateMedicalHistoryEntryRequest = MedicalHistoryEntryRequest;

export interface MedicalHistoryEntryResponse {
  id: string;
  patientRecordId: string;
  title: string;
  summary: string;
  entryDate: string;
  sourceType: MedicalHistorySourceType;
  sourceDocumentId: string | null;
  sourceDocumentType: DocumentType | null;
  createdByUserId: string;
  archivedAt: string | null;
}

/**
 * Returns the label shown for the source of a Medical History entry.
 */
export function getMedicalHistorySourceLabel(sourceType: MedicalHistorySourceType): string {
  switch (sourceType) {
    case 'DOCUMENT_SUMMARY':
      return 'Document summary';
    case 'MANUAL':
      return 'Manual entry';
  }
}
