import {HttpClient,} from '@angular/common/http';
import {inject, Injectable,} from '@angular/core';
import {Observable,} from 'rxjs';

import {environment,} from '../../../../environments/environment';
import {MedicalHistoryEntryResponse,} from '../models/medical-history-model';

@Injectable({
  providedIn: 'root',
})
export class MedicalHistoryApiService {
  private readonly http = inject(HttpClient);

  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;

  getMedicalHistory(patientRecordId: string): Observable<MedicalHistoryEntryResponse[]> {
    return this.http.get<MedicalHistoryEntryResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/medical-history`);
  }
}
