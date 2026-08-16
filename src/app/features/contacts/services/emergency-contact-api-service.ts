import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { CreateEmergencyContactRequest, EmergencyContactResponse, UpdateEmergencyContactRequest } from '../models/emergency-contact-model';

@Injectable({
  providedIn: 'root',
})
export class EmergencyContactApiService {
  private readonly http = inject(HttpClient);
  private readonly patientRecordsUrl = `${environment.apiBaseUrl}/patient-records`;
  private readonly contactsUrl = `${environment.apiBaseUrl}/emergency-contacts`;

  createEmergencyContact(patientRecordId: string, request: CreateEmergencyContactRequest): Observable<EmergencyContactResponse> {
    return this.http.post<EmergencyContactResponse>(`${this.patientRecordsUrl}/${patientRecordId}/emergency-contacts`, request);
  }

  getEmergencyContacts(patientRecordId: string): Observable<EmergencyContactResponse[]> {
    return this.http.get<EmergencyContactResponse[]>(`${this.patientRecordsUrl}/${patientRecordId}/emergency-contacts`);
  }

  getEmergencyContact(contactId: string): Observable<EmergencyContactResponse> {
    return this.http.get<EmergencyContactResponse>(`${this.contactsUrl}/${contactId}`);
  }

  updateEmergencyContact(contactId: string, request: UpdateEmergencyContactRequest): Observable<EmergencyContactResponse> {
    return this.http.put<EmergencyContactResponse>(`${this.contactsUrl}/${contactId}`, request);
  }

  archiveEmergencyContact(contactId: string): Observable<EmergencyContactResponse> {
    return this.http.patch<EmergencyContactResponse>(`${this.contactsUrl}/${contactId}/archive`, null);
  }
}
