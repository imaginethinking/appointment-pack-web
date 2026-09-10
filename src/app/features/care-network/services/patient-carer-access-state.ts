import {inject, Injectable, signal} from '@angular/core';
import {finalize, Observable, tap} from 'rxjs';

import {
  CreateCarerInvitationRequest,
  PatientCarerAccessResponse,
  UpdatePatientCarerPermissionsRequest,
} from '../models/patient-carer-access-model';
import {PatientCarerAccessApiService} from './patient-carer-access-api-service';

/**
 * Keeps patient and carer relationships up to date as they are loaded or changed.
 */
@Injectable({
  providedIn: 'root',
})
export class PatientCarerAccessState {
  private readonly accessApi = inject(PatientCarerAccessApiService);

  private readonly asPatientRelationshipsValue = signal<readonly PatientCarerAccessResponse[]>([]);
  private readonly asCarerRelationshipsValue = signal<readonly PatientCarerAccessResponse[]>([]);
  private readonly loadingAsPatientValue = signal(false);
  private readonly loadingAsCarerValue = signal(false);

  readonly asPatientRelationships = this.asPatientRelationshipsValue.asReadonly();
  readonly asCarerRelationships = this.asCarerRelationshipsValue.asReadonly();
  readonly isLoadingAsPatient = this.loadingAsPatientValue.asReadonly();
  readonly isLoadingAsCarer = this.loadingAsCarerValue.asReadonly();

  /**
   * Loads the relationships where the current user owns the patient record.
   */
  loadAsPatient(): Observable<PatientCarerAccessResponse[]> {
    this.loadingAsPatientValue.set(true);

    return this.accessApi.getAsPatient().pipe(
      tap((relationships) => {
        this.asPatientRelationshipsValue.set(relationships);
      }),
      finalize(() => {
        this.loadingAsPatientValue.set(false);
      })
    );
  }

  /**
   * Loads the relationships where the current user has access as a carer.
   */
  loadAsCarer(): Observable<PatientCarerAccessResponse[]> {
    this.loadingAsCarerValue.set(true);

    return this.accessApi.getAsCarer().pipe(
      tap((relationships) => {
        this.asCarerRelationshipsValue.set(relationships);
      }),
      finalize(() => {
        this.loadingAsCarerValue.set(false);
      })
    );
  }

  /**
   * Invites a carer and adds the returned relationship to the current state.
   */
  inviteCarer(request: CreateCarerInvitationRequest): Observable<PatientCarerAccessResponse> {
    return this.accessApi.inviteCarer(request).pipe(
      tap((relationship) => {
        this.updateAsPatientRelationship(relationship);
      })
    );
  }

  /**
   * Saves the carer's permissions and updates the relationship in the current state.
   */
  updatePermissions(
    accessId: string,
    request: UpdatePatientCarerPermissionsRequest,
  ): Observable<PatientCarerAccessResponse> {
    return this.accessApi.updatePermissions(accessId, request).pipe(
      tap((relationship) => {
        this.updateAsPatientRelationship(relationship);
      })
    );
  }

  /**
   * Cancels a pending carer invitation and updates the relationship state.
   */
  cancelInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.accessApi.cancelInvitation(accessId).pipe(
      tap((relationship) => {
        this.updateAsPatientRelationship(relationship);
      })
    );
  }

  /**
   * Revokes an active carer's access and updates the relationship state.
   */
  revokeAccess(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.accessApi.revokeAccess(accessId).pipe(
      tap((relationship) => {
        this.updateAsPatientRelationship(relationship);
      })
    );
  }

  /**
   * Accepts a carer invitation and updates the relationship in the current state.
   */
  acceptInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.accessApi.acceptInvitation(accessId).pipe(
      tap((relationship) => {
        this.updateAsCarerRelationship(relationship);
      })
    );
  }

  /**
   * Declines a carer invitation and updates the relationship in the current state.
   */
  declineInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.accessApi.declineInvitation(accessId).pipe(
      tap((relationship) => {
        this.updateAsCarerRelationship(relationship);
      })
    );
  }

  /**
   * Clears the loaded patient and carer relationships.
   */
  reset(): void {
    this.asPatientRelationshipsValue.set([]);
    this.asCarerRelationshipsValue.set([]);
    this.loadingAsPatientValue.set(false);
    this.loadingAsCarerValue.set(false);
  }

  /**
   * Adds or updates a relationship in the list where the current user owns the patient record.
   */
  private updateAsPatientRelationship(updatedRelationship: PatientCarerAccessResponse): void {
    const relationships = this.asPatientRelationshipsValue();

    const relationshipExists = relationships.some(
      (relationship) => relationship.id === updatedRelationship.id,
    );

    if (!relationshipExists) {
      this.asPatientRelationshipsValue.set([updatedRelationship, ...relationships]);

      return;
    }

    this.asPatientRelationshipsValue.set(
      relationships.map((relationship) =>
        relationship.id === updatedRelationship.id ? updatedRelationship : relationship,
      )
    );
  }

  /**
   * Adds or updates a relationship in the list where the current user has carer access.
   */
  private updateAsCarerRelationship(updatedRelationship: PatientCarerAccessResponse): void {
    const relationships = this.asCarerRelationshipsValue();

    const relationshipExists = relationships.some(
      (relationship) => relationship.id === updatedRelationship.id,
    );

    if (!relationshipExists) {
      this.asCarerRelationshipsValue.set([updatedRelationship, ...relationships]);

      return;
    }

    this.asCarerRelationshipsValue.set(
      relationships.map((relationship) =>
        relationship.id === updatedRelationship.id ? updatedRelationship : relationship,
      )
    );
  }
}
