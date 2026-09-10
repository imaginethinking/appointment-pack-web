import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../../environments/environment';
import {AppointmentResponse, CreateAppointmentRequest, UpdateAppointmentRequest} from '../models/appointment-model';

/**
 * Provides the API calls used to manage appointments.
 */
@Injectable({
  providedIn: 'root',
})
export class AppointmentApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly appointmentsUrl = `${environment.apiBaseUrl}/appointments`;

  /**
   * Creates an appointment for the selected patient.
   */
  createAppointment(patientRecordId: string, request: CreateAppointmentRequest): Observable<AppointmentResponse> {
    return this.http.post<AppointmentResponse>(`${this.patientRecordsUrl}/${patientRecordId}/appointments`, request);
  }

  /**
   * Loads the appointments for the selected patient.
   */
  getAppointments(patientRecordId: string): Observable<AppointmentResponse[]> {
    return this.http.get<AppointmentResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/appointments`);
  }

  /**
   * Loads an appointment by its id.
   */
  getAppointment(appointmentId: string): Observable<AppointmentResponse> {
    return this.http.get<AppointmentResponse>(`${this.appointmentsUrl}/${appointmentId}`);
  }

  /**
   * Saves changes to an appointment.
   */
  updateAppointment(appointmentId: string, request: UpdateAppointmentRequest): Observable<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`${this.appointmentsUrl}/${appointmentId}`, request);
  }

  /**
   * Archives an appointment.
   */
  archiveAppointment(appointmentId: string): Observable<AppointmentResponse> {
    return this.http.patch<AppointmentResponse>(`${this.appointmentsUrl}/${appointmentId}/archive`, null);
  }
}
