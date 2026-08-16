import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AppointmentResponse, CreateAppointmentRequest, UpdateAppointmentRequest } from '../models/appointment-model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly appointmentsUrl = `${environment.apiBaseUrl}/appointments`;

  createAppointment(patientRecordId: string, request: CreateAppointmentRequest): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${this.patientRecordsUrl}/${patientRecordId}/appointments`, request);
  }

  getAppointments(patientRecordId: string): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/appointments`);
  }

  getAppointment(appointmentId: string): Observable<AppointmentResponse> {
    return this.http.get<AppointmentResponse>(`${this.appointmentsUrl}/${appointmentId}`);
  }

  updateAppointment(appointmentId: string, request: UpdateAppointmentRequest): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`${this.appointmentsUrl}/${appointmentId}`, request);
  }

  archiveAppointment(appointmentId: string): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(`${this.appointmentsUrl}/${appointmentId}/archive`, null);
  }
}
