import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreatePatientRecordRequest,
  PatientRecordResponse,
  UpdatePatientRecordRequest,
} from '../models/patient-record-model';

@Injectable({
  providedIn: 'root',
})
export class PatientRecordApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;

  createPatientRecord(request: CreatePatientRecordRequest): Observable<PatientRecordResponse> {
    return this.http.post<PatientRecordResponse>(this.patientRecordsUrl, request);
  }

  getCurrentPatientRecord(): Observable<PatientRecordResponse> {
    return this.http.get<PatientRecordResponse>(`${this.patientRecordsUrl}/me`);
  }

  getPatientRecord(patientRecordId: string): Observable<PatientRecordResponse> {
    return this.http.get<PatientRecordResponse>(`${this.patientRecordsUrl}/${patientRecordId}`);
  }

  updatePatientRecord(patientRecordId: string, request: UpdatePatientRecordRequest,): Observable<PatientRecordResponse> {
    return this.http.put<PatientRecordResponse>(`${this.patientRecordsUrl}/${patientRecordId}`, request);
  }
}
