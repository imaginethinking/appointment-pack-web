import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AppointmentPackGenerationRequest, AppointmentPackResponse } from '../models/appointment-pack-model';

@Injectable({
  providedIn: 'root',
})
export class AppointmentPackApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly appointmentPacksUrl = `${environment.apiBaseUrl}/appointment-packs`;

  generateAppointmentPack(patientRecordId: string, request: AppointmentPackGenerationRequest): Observable<AppointmentPackResponse> {
    return this.http.post<AppointmentPackResponse>(`${this.patientRecordsUrl}/${patientRecordId}/appointment-packs`, request);
  }

  getAppointmentPacks(patientRecordId: string): Observable<AppointmentPackResponse[]> {
    return this.http.get<AppointmentPackResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/appointment-packs`);
  }

  getAppointmentPack(appointmentPackId: string): Observable<AppointmentPackResponse> {
    return this.http.get<AppointmentPackResponse>(`${this.appointmentPacksUrl}/${appointmentPackId}`);
  }

  previewAppointmentPack(appointmentPackId: string): Observable<Blob> {
    return this.http.get(`${this.appointmentPacksUrl}/${appointmentPackId}/preview`, {
      responseType: 'blob',
    });
  }

  downloadAppointmentPack(appointmentPackId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.appointmentPacksUrl}/${appointmentPackId}/file`, {
      observe: 'response',
      responseType: 'blob',
    });
  }

  archiveAppointmentPack(appointmentPackId: string): Observable<AppointmentPackResponse> {
    return this.http.patch<AppointmentPackResponse>(`${this.appointmentPacksUrl}/${appointmentPackId}/archive`, null);
  }
}
