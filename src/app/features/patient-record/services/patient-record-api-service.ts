import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../../environments/environment';
import {
  CreatePatientRecordRequest,
  PatientRecordResponse,
  UpdatePatientRecordRequest,
} from '../models/patient-record-model';

/**
 * Provides the API calls used to create load and update patient records.
 */
@Injectable({
  providedIn: 'root',
})
export class PatientRecordApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;

  /**
   * Creates the patient record for the current user.
   */
  createPatientRecord(request: CreatePatientRecordRequest): Observable<PatientRecordResponse> {
    return this.http.post<PatientRecordResponse>(this.patientRecordsUrl, request);
  }

  /**
   * Loads the patient record owned by the current user.
   */
  getCurrentPatientRecord(): Observable<PatientRecordResponse> {
    return this.http.get<PatientRecordResponse>(`${this.patientRecordsUrl}/me`);
  }

  /**
   * Loads a patient record by its id.
   */
  getPatientRecord(patientRecordId: string): Observable<PatientRecordResponse> {
    return this.http.get<PatientRecordResponse>(`${this.patientRecordsUrl}/${patientRecordId}`);
  }

  /**
   * Saves changes to a patient record.
   */
  updatePatientRecord(patientRecordId: string, request: UpdatePatientRecordRequest,): Observable<PatientRecordResponse> {
    return this.http.put<PatientRecordResponse>(`${this.patientRecordsUrl}/${patientRecordId}`, request);
  }
}
