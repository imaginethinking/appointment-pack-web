import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../../environments/environment';
import {CreateMedicationRequest, MedicationResponse, UpdateMedicationRequest} from '../models/medication-model';

/**
 * Provides the API calls used to manage medications.
 */
@Injectable({
  providedIn: 'root',
})
export class MedicationApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly medicationsUrl = `${environment.apiBaseUrl}/medications`;

  /**
   * Creates a medication for the selected patient.
   */
  createMedication(patientRecordId: string, request: CreateMedicationRequest): Observable<MedicationResponse> {
    return this.http.post<MedicationResponse>(`${this.patientRecordsUrl}/${patientRecordId}/medications`, request);
  }

  /**
   * Loads the medications for the selected patient.
   */
  getMedications(patientRecordId: string): Observable<MedicationResponse[]> {
    return this.http.get<MedicationResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/medications`);
  }

  /**
   * Saves changes to a medication.
   */
  getMedication(medicationId: string): Observable<MedicationResponse> {
    return this.http.get<MedicationResponse>(`${this.medicationsUrl}/${medicationId}`);
  }

  /**
   * Saves changes to a medication.
   */
  updateMedication(medicationId: string, request: UpdateMedicationRequest): Observable<MedicationResponse> {
    return this.http.put<MedicationResponse>(`${this.medicationsUrl}/${medicationId}`, request);
  }

  /**
   * Archives a medication.
   */
  archiveMedication(medicationId: string): Observable<MedicationResponse> {
    return this.http.patch<MedicationResponse>(`${this.medicationsUrl}/${medicationId}/archive`, null);
  }
}
