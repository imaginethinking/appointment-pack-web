import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateMedicalHistoryEntryRequest,
  MedicalHistoryEntryResponse,
  UpdateMedicalHistoryEntryRequest,
} from '../models/medical-history-model';

@Injectable({
  providedIn: 'root',
})
export class MedicalHistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly medicalHistoryUrl = `${environment.apiBaseUrl}/medical-history`;

  createMedicalHistoryEntry(patientRecordId: string, request: CreateMedicalHistoryEntryRequest): Observable<MedicalHistoryEntryResponse> {
    return this.http.post<MedicalHistoryEntryResponse>(`${this.patientRecordsUrl}/${patientRecordId}/medical-history`, request);
  }

  getMedicalHistory(patientRecordId: string): Observable<MedicalHistoryEntryResponse[]> {
    return this.http.get<MedicalHistoryEntryResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/medical-history`);
  }

  getMedicalHistoryEntry(entryId: string): Observable<MedicalHistoryEntryResponse> {
    return this.http.get<MedicalHistoryEntryResponse>(`${this.medicalHistoryUrl}/${entryId}`);
  }

  updateMedicalHistoryEntry(entryId: string, request: UpdateMedicalHistoryEntryRequest): Observable<MedicalHistoryEntryResponse> {
    return this.http.put<MedicalHistoryEntryResponse>(`${this.medicalHistoryUrl}/${entryId}`, request);
  }

  archiveMedicalHistoryEntry(entryId: string): Observable<MedicalHistoryEntryResponse> {
    return this.http.patch<MedicalHistoryEntryResponse>(`${this.medicalHistoryUrl}/${entryId}/archive`, null);
  }
}
