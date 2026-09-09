import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { BloodTestResponse, CreateBloodTestRequest, UpdateBloodTestRequest } from '../models/blood-test-model';

/**
 * Handles requests for blood tests and their individual results.
 */
@Injectable({
  providedIn: 'root',
})
export class BloodTestApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly bloodTestsUrl = `${environment.apiBaseUrl}/blood-tests`;

  /**
   * Adds a blood test to the selected patient record.
   */
  createBloodTest(patientRecordId: string, request: CreateBloodTestRequest): Observable<BloodTestResponse> {
    return this.http.post<BloodTestResponse>(`${this.patientRecordsUrl}/${patientRecordId}/blood-tests`, request);
  }

  /**
   * Loads the blood tests recorded for a patient.
   */
  getBloodTests(patientRecordId: string): Observable<BloodTestResponse[]> {
    return this.http.get<BloodTestResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/blood-tests`);
  }

  /**
   * Loads a single blood test using its id.
   */
  getBloodTest(bloodTestId: string): Observable<BloodTestResponse> {
    return this.http.get<BloodTestResponse>(`${this.bloodTestsUrl}/${bloodTestId}`);
  }

  /**
   * Saves the updated details and results for a blood test.
   */
  updateBloodTest(bloodTestId: string, request: UpdateBloodTestRequest): Observable<BloodTestResponse> {
    return this.http.put<BloodTestResponse>(`${this.bloodTestsUrl}/${bloodTestId}`, request);
  }

  /**
   * Archives a blood test so it is removed from the active results list.
   */
  archiveBloodTest(bloodTestId: string): Observable<BloodTestResponse> {
    return this.http.patch<BloodTestResponse>(`${this.bloodTestsUrl}/${bloodTestId}/archive`, null);
  }
}
