import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  CreateCarerInvitationRequest,
  PatientCarerAccessResponse,
  UpdatePatientCarerPermissionsRequest,
} from '../models/patient-carer-access-model';

/**
 * Provides the API calls used to manage patient and carer relationships.
 */
@Injectable({
  providedIn: 'root',
})
export class PatientCarerAccessApiService {
  private readonly http = inject(HttpClient);
  private readonly accessUrl = `${environment.apiBaseUrl}/patient-carer-access`;

  /**
   * Creates a carer invitation with the selected permissions.
   */
  inviteCarer(request: CreateCarerInvitationRequest): Observable<PatientCarerAccessResponse> {
    return this.http.post<PatientCarerAccessResponse>(this.accessUrl, request);
  }

  /**
   * Loads a patient and carer relationship by its id.
   */
  getRelationship(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.http.get<PatientCarerAccessResponse>(`${this.accessUrl}/${accessId}`);
  }

  /**
   * Loads relationships where the current user owns the patient record.
   */
  getAsPatient(): Observable<PatientCarerAccessResponse[]> {
    return this.http.get<PatientCarerAccessResponse[]>(`${this.accessUrl}/as-patient`);
  }

  /**
   * Loads relationships where the current user has access as a carer.
   */
  getAsCarer(): Observable<PatientCarerAccessResponse[]> {
    return this.http.get<PatientCarerAccessResponse[]>(`${this.accessUrl}/as-carer`);
  }

  /**
   * Accepts a pending carer invitation.
   */
  acceptInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.patchStatus(accessId, 'accept');
  }

  /**
   * Declines a pending carer invitation.
   */
  declineInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.patchStatus(accessId, 'decline');
  }

  /**
   * Cancels a pending invitation sent to a carer.
   */
  cancelInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.patchStatus(accessId, 'cancel');
  }

  /**
   * Revokes an active carer relationship.
   */
  revokeAccess(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.patchStatus(accessId, 'revoke');
  }

  /**
   * Saves the permissions selected for a carer relationship.
   */
  updatePermissions(accessId: string, request: UpdatePatientCarerPermissionsRequest): Observable<PatientCarerAccessResponse> {
    return this.http.put<PatientCarerAccessResponse>(`${this.accessUrl}/${accessId}/permissions`, request);
  }

  /**
   * Updates a relationship using the requested status action.
   */
  private patchStatus(accessId: string, action: 'accept' | 'decline' | 'cancel' | 'revoke'): Observable<PatientCarerAccessResponse> {
    return this.http.patch<PatientCarerAccessResponse>(`${this.accessUrl}/${accessId}/${action}`, null);
  }
}
