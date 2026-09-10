import {HttpClient, HttpResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../../environments/environment';
import {AppointmentPackGenerationRequest, AppointmentPackResponse} from '../models/appointment-pack-model';

/**
 * Handles requests for creating viewing downloading and archiving Appointment Packs.
 */
@Injectable({
  providedIn: 'root',
})
export class AppointmentPackApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly appointmentPacksUrl = `${environment.apiBaseUrl}/appointment-packs`;

  /**
   * Generates an Appointment Pack for the selected patient using the chosen appointment and patient information.
   */
  generateAppointmentPack(patientRecordId: string, request: AppointmentPackGenerationRequest): Observable<AppointmentPackResponse> {
    return this.http.post<AppointmentPackResponse>(`${this.patientRecordsUrl}/${patientRecordId}/appointment-packs`, request);
  }

  /**
   * Retrieves a single Appointment Pack by its id.
   */
  getAppointmentPacks(patientRecordId: string): Observable<AppointmentPackResponse[]> {
    return this.http.get<AppointmentPackResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/appointment-packs`);
  }

  /**
   * Retrieves a single Appointment Pack by its id.
   */
  getAppointmentPack(appointmentPackId: string): Observable<AppointmentPackResponse> {
    return this.http.get<AppointmentPackResponse>(`${this.appointmentPacksUrl}/${appointmentPackId}`);
  }

  /**
   * Loads the Appointment Pack PDF as a Blob for preview in the browser.
   */
  previewAppointmentPack(appointmentPackId: string): Observable<Blob> {
    return this.http.get(`${this.appointmentPacksUrl}/${appointmentPackId}/preview`, {
      responseType: 'blob',
    });
  }

  /**
   * Loads the Appointment Pack PDF together with the response information needed for download.
   */
  downloadAppointmentPack(appointmentPackId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.appointmentPacksUrl}/${appointmentPackId}/file`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  /**
   * Archives an Appointment Pack.
   */
  archiveAppointmentPack(appointmentPackId: string): Observable<AppointmentPackResponse> {
    return this.http.patch<AppointmentPackResponse>(`${this.appointmentPacksUrl}/${appointmentPackId}/archive`, null);
  }
}
