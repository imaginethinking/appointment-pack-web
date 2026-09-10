import {HttpClient, HttpParams} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../../environments/environment';
import {PatientAuditPageResponse} from '../models/patient-audit-model';

/**
 * Loads the recorded activity for a patient.
 */
@Injectable({
  providedIn: 'root',
})
export class PatientAuditApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;

  /**
   * Loads one page of activity for the selected patient.
   */
  getAuditEvents(patientRecordId: string, page: number, size: number): Observable<PatientAuditPageResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PatientAuditPageResponse>(
      `${this.patientRecordsUrl}/${patientRecordId}/audit-events`,
      { params },
    );
  }
}
