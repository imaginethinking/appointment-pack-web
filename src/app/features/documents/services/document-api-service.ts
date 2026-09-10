import {HttpClient, HttpResponse,} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../../environments/environment';
import {AppointmentConfirmationRequest, AppointmentResponse,} from '../../appointments/models/appointment-model';
import {
  DocumentProcessingResultResponse,
  DocumentResponse,
  DocumentSummarisationRequest,
  DocumentSummaryAcceptanceRequest,
  DocumentType,
} from '../models/document-model';

/**
 * Handles document upload processing review and download requests.
 */
@Injectable({
  providedIn: 'root',
})
export class DocumentApiService {
  private readonly http = inject(HttpClient);

  private readonly documentsUrl = `${environment.apiBaseUrl}/documents`;
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;

  /**
   * Uploads a document for a patient using the selected document type and file.
   */
  uploadDocument(
    patientRecordId: string,
    documentType: DocumentType,
    file: File,
  ): Observable<DocumentResponse> {
    const formData = new FormData();

    formData.append('documentType', documentType);
    formData.append('file', file);

    return this.http.post<DocumentResponse>(
      `${this.patientRecordsUrl}/${patientRecordId}/documents`,
      formData,
    );
  }

  /**
   * Loads the documents belonging to a patient.
   */
  getDocuments(
    patientRecordId: string,
  ): Observable<DocumentResponse[]> {
    return this.http.get<DocumentResponse[]>(
      `${this.patientRecordsUrl}/${patientRecordId}/documents`,
    );
  }

  /**
   * Loads a single document using its id.
   */
  getDocument(
    documentId: string,
  ): Observable<DocumentResponse> {
    return this.http.get<DocumentResponse>(
      `${this.documentsUrl}/${documentId}`,
    );
  }

  /**
   * Loads the processing and review information stored for a document.
   */
  getDocumentProcessing(
    documentId: string,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.get<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/processing`,
    );
  }

  /**
   * Starts document processing and returns the latest processing result.
   */
  extractDocument(
    documentId: string,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/extract`,
      null,
    );
  }

  /**
   * Confirms the reviewed appointment details from an appointment letter.
   */
  confirmAppointment(
    documentId: string,
    request: AppointmentConfirmationRequest,
  ): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(
      `${this.documentsUrl}/${documentId}/appointment/confirm`,
      request,
    );
  }

  /**
   * Rejects the appointment details produced from an appointment letter.
   */
  rejectAppointment(
    documentId: string,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/appointment/reject`,
      null,
    );
  }

  /**
   * Submits the approved deidentified consultation text for summarisation.
   */
  summariseDocument(
    documentId: string,
    request: DocumentSummarisationRequest,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/summarise`,
      request,
    );
  }

  /**
   * Accepts the reviewed consultation summary and its Medical History details.
   */
  acceptDocumentSummary(
    documentId: string,
    request: DocumentSummaryAcceptanceRequest,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/summary/accept`,
      request,
    );
  }

  /**
   * Rejects a generated consultation summary.
   */
  rejectDocumentSummary(
    documentId: string,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/summary/reject`,
      null,
    );
  }

  /**
   * Archives a document.
   */
  archiveDocument(
    documentId: string,
  ): Observable<DocumentResponse> {
    return this.http.patch<DocumentResponse>(
      `${this.documentsUrl}/${documentId}/archive`,
      null,
    );
  }

  /**
   * Downloads the original document together with its response information.
   */
  downloadDocument(
    documentId: string,
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.documentsUrl}/${documentId}/file`,
      {
        observe: 'response',
        responseType: 'blob',
      },
    );
  }
}
