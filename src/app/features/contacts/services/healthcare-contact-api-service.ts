import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CreateHealthcareContactRequest, HealthcareContactResponse, UpdateHealthcareContactRequest } from '../models/healthcare-contact-model';

/**
 * Provides the API calls used to manage healthcare contacts.
 */
@Injectable({
  providedIn: 'root',
})
export class HealthcareContactApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly contactsUrl = `${environment.apiBaseUrl}/healthcare-contacts`;

  /**
   * Creates a healthcare contact for the selected patient.
   */
  createHealthcareContact(patientRecordId: string, request: CreateHealthcareContactRequest): Observable<HealthcareContactResponse> {
    return this.http.post<HealthcareContactResponse>(`${this.patientRecordsUrl}/${patientRecordId}/healthcare-contacts`, request);
  }

  /**
   * Loads the healthcare contacts for the selected patient.
   */
  getHealthcareContacts(patientRecordId: string): Observable<HealthcareContactResponse[]> {
    return this.http.get<HealthcareContactResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/healthcare-contacts`);
  }

  /**
   * Loads a healthcare contact by its id.
   */
  getHealthcareContact(contactId: string): Observable<HealthcareContactResponse> {
    return this.http.get<HealthcareContactResponse>(`${this.contactsUrl}/${contactId}`);
  }

  /**
   * Saves changes to a healthcare contact.
   */
  updateHealthcareContact(contactId: string, request: UpdateHealthcareContactRequest): Observable<HealthcareContactResponse> {
    return this.http.put<HealthcareContactResponse>(`${this.contactsUrl}/${contactId}`, request);
  }

  /**
   * Archives a healthcare contact.
   */
  archiveHealthcareContact(contactId: string): Observable<HealthcareContactResponse> {
    return this.http.patch<HealthcareContactResponse>(`${this.contactsUrl}/${contactId}/archive`, null);
  }
}
