import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CreateHealthcareContactRequest, HealthcareContactResponse, UpdateHealthcareContactRequest } from '../models/healthcare-contact-model';

@Injectable({
  providedIn: 'root',
})
export class HealthcareContactApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly contactsUrl = `${environment.apiBaseUrl}/healthcare-contacts`;

  createHealthcareContact(patientRecordId: string, request: CreateHealthcareContactRequest): Observable<HealthcareContactResponse> {
    return this.http.post<HealthcareContactResponse>(`${this.patientRecordsUrl}/${patientRecordId}/healthcare-contacts`, request);
  }

  getHealthcareContacts(patientRecordId: string): Observable<HealthcareContactResponse[]> {
    return this.http.get<HealthcareContactResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/healthcare-contacts`);
  }

  getHealthcareContact(contactId: string): Observable<HealthcareContactResponse> {
    return this.http.get<HealthcareContactResponse>(`${this.contactsUrl}/${contactId}`);
  }

  updateHealthcareContact(contactId: string, request: UpdateHealthcareContactRequest): Observable<HealthcareContactResponse> {
    return this.http.put<HealthcareContactResponse>(`${this.contactsUrl}/${contactId}`, request);
  }

  archiveHealthcareContact(contactId: string): Observable<HealthcareContactResponse> {
    return this.http.patch<HealthcareContactResponse>(`${this.contactsUrl}/${contactId}/archive`, null);
  }
}
