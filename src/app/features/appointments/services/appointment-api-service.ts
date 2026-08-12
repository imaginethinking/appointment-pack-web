import {HttpClient,} from '@angular/common/http';
import {inject, Injectable,} from '@angular/core';
import {Observable,} from 'rxjs';

import {environment} from '../../../../environments/environment';
import {AppointmentResponse,} from '../models/appointment-model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentApiService {
  private readonly http = inject(HttpClient);

  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;

  getAppointments(
    patientRecordId: string,
  ): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/appointments`);
  }
}
