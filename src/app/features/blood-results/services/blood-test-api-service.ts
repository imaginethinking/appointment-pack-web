import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { BloodTestResponse, CreateBloodTestRequest, UpdateBloodTestRequest } from '../models/blood-test-model';

@Injectable({
  providedIn: 'root',
})
export class BloodTestApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly bloodTestsUrl = `${environment.apiBaseUrl}/blood-tests`;

  createBloodTest(patientRecordId: string, request: CreateBloodTestRequest): Observable<BloodTestResponse> {
    return this.http.post<BloodTestResponse>(`${this.patientRecordsUrl}/${patientRecordId}/blood-tests`, request);
  }

  getBloodTests(patientRecordId: string): Observable<BloodTestResponse[]> {
    return this.http.get<BloodTestResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/blood-tests`);
  }

  getBloodTest(bloodTestId: string): Observable<BloodTestResponse> {
    return this.http.get<BloodTestResponse>(`${this.bloodTestsUrl}/${bloodTestId}`);
  }

  updateBloodTest(bloodTestId: string, request: UpdateBloodTestRequest): Observable<BloodTestResponse> {
    return this.http.put<BloodTestResponse>(`${this.bloodTestsUrl}/${bloodTestId}`, request);
  }

  archiveBloodTest(bloodTestId: string): Observable<BloodTestResponse> {
    return this.http.patch<BloodTestResponse>(`${this.bloodTestsUrl}/${bloodTestId}/archive`, null);
  }
}
