import {
  HttpClient,
  HttpResponse,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AppointmentConfirmationRequest,
  AppointmentResponse,
} from '../../appointments/models/appointment-model';
import {
  DocumentProcessingResultResponse,
  DocumentResponse,
  DocumentSummarisationRequest,
  DocumentSummaryAcceptanceRequest,
  DocumentType,
} from '../models/document-model';

@Injectable({
  providedIn: 'root',
})
export class DocumentApiService {
  private readonly http = inject(HttpClient);

  private readonly documentsUrl = `${environment.apiBaseUrl}/documents`;

  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;

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

  getDocuments(
    patientRecordId: string,
  ): Observable<DocumentResponse[]> {
    return this.http.get<DocumentResponse[]>(
      `${this.patientRecordsUrl}/${patientRecordId}/documents`,
    );
  }

  getDocument(
    documentId: string,
  ): Observable<DocumentResponse> {
    return this.http.get<DocumentResponse>(
      `${this.documentsUrl}/${documentId}`,
    );
  }

  getDocumentProcessing(
    documentId: string,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.get<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/processing`,
    );
  }

  extractDocument(
    documentId: string,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/extract`,
      null,
    );
  }

  confirmAppointment(
    documentId: string,
    request: AppointmentConfirmationRequest,
  ): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(
      `${this.documentsUrl}/${documentId}/appointment/confirm`,
      request,
    );
  }

  rejectAppointment(
    documentId: string,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/appointment/reject`,
      null,
    );
  }

  summariseDocument(
    documentId: string,
    request: DocumentSummarisationRequest,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/summarise`,
      request,
    );
  }

  acceptDocumentSummary(
    documentId: string,
    request: DocumentSummaryAcceptanceRequest,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/summary/accept`,
      request,
    );
  }

  rejectDocumentSummary(
    documentId: string,
  ): Observable<DocumentProcessingResultResponse> {
    return this.http.post<DocumentProcessingResultResponse>(
      `${this.documentsUrl}/${documentId}/summary/reject`,
      null,
    );
  }

  archiveDocument(
    documentId: string,
  ): Observable<DocumentResponse> {
    return this.http.patch<DocumentResponse>(
      `${this.documentsUrl}/${documentId}/archive`,
      null,
    );
  }

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
