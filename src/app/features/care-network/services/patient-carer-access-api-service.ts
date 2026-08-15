import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateCarerInvitationRequest,
  PatientCarerAccessResponse,
  UpdatePatientCarerPermissionsRequest,
} from '../models/patient-carer-access-model';

@Injectable({
  providedIn: 'root',
})
export class PatientCarerAccessApiService {
  private readonly http = inject(HttpClient);
  private readonly accessUrl = `${environment.apiBaseUrl}/patient-carer-access`;

  inviteCarer(request: CreateCarerInvitationRequest): Observable<PatientCarerAccessResponse> {
    return this.http.post<PatientCarerAccessResponse>(this.accessUrl, request);
  }

  getRelationship(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.http.get<PatientCarerAccessResponse>(`${this.accessUrl}/${accessId}`);
  }

  getAsPatient(): Observable<PatientCarerAccessResponse[]> {
    return this.http.get<PatientCarerAccessResponse[]>(`${this.accessUrl}/as-patient`);
  }

  getAsCarer(): Observable<PatientCarerAccessResponse[]> {
    return this.http.get<PatientCarerAccessResponse[]>(`${this.accessUrl}/as-carer`);
  }

  acceptInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.patchStatus(accessId, 'accept');
  }

  declineInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.patchStatus(accessId, 'decline');
  }

  cancelInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.patchStatus(accessId, 'cancel');
  }

  revokeAccess(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.patchStatus(accessId, 'revoke');
  }

  updatePermissions(accessId: string, request: UpdatePatientCarerPermissionsRequest): Observable<PatientCarerAccessResponse> {
    return this.http.put<PatientCarerAccessResponse>(`${this.accessUrl}/${accessId}/permissions`, request);
  }

  private patchStatus(accessId: string, action: 'accept' | 'decline' | 'cancel' | 'revoke'): Observable<PatientCarerAccessResponse> {
    return this.http.patch<PatientCarerAccessResponse>(`${this.accessUrl}/${accessId}/${action}`, null);
  }
}
