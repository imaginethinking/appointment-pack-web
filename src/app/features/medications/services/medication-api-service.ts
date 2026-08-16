import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CreateMedicationRequest, MedicationResponse, UpdateMedicationRequest } from '../models/medication-model';

@Injectable({
  providedIn: 'root',
})
export class MedicationApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly medicationsUrl = `${environment.apiBaseUrl}/medications`;

  createMedication(patientRecordId: string, request: CreateMedicationRequest): Observable<MedicationResponse> {
    return this.http.post<MedicationResponse>(`${this.patientRecordsUrl}/${patientRecordId}/medications`, request);
  }

  getMedications(patientRecordId: string): Observable<MedicationResponse[]> {
    return this.http.get<MedicationResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/medications`);
  }

  getMedication(medicationId: string): Observable<MedicationResponse> {
    return this.http.get<MedicationResponse>(`${this.medicationsUrl}/${medicationId}`);
  }

  updateMedication(medicationId: string, request: UpdateMedicationRequest): Observable<MedicationResponse> {
    return this.http.put<MedicationResponse>(`${this.medicationsUrl}/${medicationId}`, request);
  }

  archiveMedication(medicationId: string): Observable<MedicationResponse> {
    return this.http.patch<MedicationResponse>(`${this.medicationsUrl}/${medicationId}/archive`, null);
  }
}
