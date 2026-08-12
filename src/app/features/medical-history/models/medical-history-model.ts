import {DocumentType} from '../../documents/models/document-model';

export const MEDICAL_HISTORY_SOURCE_TYPES = [
  'DOCUMENT_SUMMARY',
] as const;

export type MedicalHistorySourceType = (typeof MEDICAL_HISTORY_SOURCE_TYPES)[number];

export interface MedicalHistoryEntryResponse {
  id: string;
  title: string;
  summary: string;
  entryDate: string;
  sourceType: MedicalHistorySourceType;
  sourceDocumentId: string | null;
  sourceDocumentType: DocumentType | null;
}

export function getMedicalHistorySourceLabel(sourceType: MedicalHistorySourceType): string {
  switch (sourceType) {
    case 'DOCUMENT_SUMMARY':
      return 'Document summary';
  }
}
