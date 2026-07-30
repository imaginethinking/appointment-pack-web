import { inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';

import {
  CreateCarerInvitationRequest,
  PatientCarerAccessResponse,
  UpdatePatientCarerPermissionsRequest,
} from '../models/patient-carer-access-model';
import { PatientCarerAccessApiService } from './patient-carer-access-api-service';

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

  inviteCarer(request: CreateCarerInvitationRequest): Observable<PatientCarerAccessResponse> {
    return this.accessApi.inviteCarer(request).pipe(
      tap((relationship) => {
        this.updateAsPatientRelationship(relationship);
      })
    );
  }

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

  cancelInvitation(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.accessApi.cancelInvitation(accessId).pipe(
      tap((relationship) => {
        this.updateAsPatientRelationship(relationship);
      })
    );
  }

  revokeAccess(accessId: string): Observable<PatientCarerAccessResponse> {
    return this.accessApi.revokeAccess(accessId).pipe(
      tap((relationship) => {
        this.updateAsPatientRelationship(relationship);
      })
    );
  }

  reset(): void {
    this.asPatientRelationshipsValue.set([]);
    this.asCarerRelationshipsValue.set([]);
    this.loadingAsPatientValue.set(false);
    this.loadingAsCarerValue.set(false);
  }

  private updateAsPatientRelationship(updatedRelationship: PatientCarerAccessResponse): void {
    const relationships = this.asPatientRelationshipsValue();

    const existingIndex = relationships.findIndex(
      (relationship) => relationship.id === updatedRelationship.id,
    );

    if (existingIndex === -1) {
      this.asPatientRelationshipsValue.set([updatedRelationship, ...relationships]);

      return;
    }

    this.asPatientRelationshipsValue.set(
      relationships.map((relationship) =>
        relationship.id === updatedRelationship.id ? updatedRelationship : relationship,
      )
    );
  }
}
