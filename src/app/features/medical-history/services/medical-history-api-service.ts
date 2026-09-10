import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../../environments/environment';
import {
  CreateMedicalHistoryEntryRequest,
  MedicalHistoryEntryResponse,
  UpdateMedicalHistoryEntryRequest,
} from '../models/medical-history-model';

/**
 * Handles requests for Medical History entries.
 */
@Injectable({
  providedIn: 'root',
})
export class MedicalHistoryApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly medicalHistoryUrl = `${environment.apiBaseUrl}/medical-history`;

  /**
   * Adds a new Medical History entry for a patient.
   */
  createMedicalHistoryEntry(patientRecordId: string, request: CreateMedicalHistoryEntryRequest): Observable<MedicalHistoryEntryResponse> {
    return this.http.post<MedicalHistoryEntryResponse>(`${this.patientRecordsUrl}/${patientRecordId}/medical-history`, request);
  }

  /**
   * Loads the Medical History entries for a patient.
   */
  getMedicalHistory(patientRecordId: string): Observable<MedicalHistoryEntryResponse[]> {
    return this.http.get<MedicalHistoryEntryResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/medical-history`);
  }

  /**
   * Loads one Medical History entry using its id.
   */
  getMedicalHistoryEntry(entryId: string): Observable<MedicalHistoryEntryResponse> {
    return this.http.get<MedicalHistoryEntryResponse>(`${this.medicalHistoryUrl}/${entryId}`);
  }

  /**
   * Saves changes made to a Medical History entry.
   */
  updateMedicalHistoryEntry(entryId: string, request: UpdateMedicalHistoryEntryRequest): Observable<MedicalHistoryEntryResponse> {
    return this.http.put<MedicalHistoryEntryResponse>(`${this.medicalHistoryUrl}/${entryId}`, request);
  }

  /**
   * Archives a Medical History entry so it no longer appears in the active history.
   */
  archiveMedicalHistoryEntry(entryId: string): Observable<MedicalHistoryEntryResponse> {
    return this.http.patch<MedicalHistoryEntryResponse>(`${this.medicalHistoryUrl}/${entryId}/archive`, null);
  }
}
