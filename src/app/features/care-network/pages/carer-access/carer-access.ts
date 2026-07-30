import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { Permission } from '../../../../core/models/permission-model';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { PatientCarerAccessResponse } from '../../models/patient-carer-access-model';
import { PatientCarerAccessState } from '../../services/patient-carer-access-state';

@Component({
  selector: 'app-carer-access',
  imports: [DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './carer-access.html',
  styleUrl: './carer-access.css',
})
export class CarerAccess {
  private readonly accessState = inject(PatientCarerAccessState);

  private readonly selectedPatientState = inject(SelectedPatientState);

  private readonly contextCoordinator = inject(PatientContextCoordinator);

  private readonly router = inject(Router);

  protected readonly relationships = this.accessState.asCarerRelationships;

  protected readonly isLoading = this.accessState.isLoadingAsCarer;

  protected readonly contextLoadFailed = this.contextCoordinator.loadFailed;

  protected readonly busyAccessId = signal<string | null>(null);

  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly patientRecordViewPermission: Permission = 'patient-record:view';

  protected readonly patientRecordEditPermission: Permission = 'patient-record:edit';

  protected readonly pendingRelationships = computed(() =>
    this.relationships().filter((relationship) => relationship.status === 'PENDING'),
  );

  protected readonly activeRelationships = computed(() =>
    this.relationships().filter((relationship) => relationship.status === 'ACTIVE'),
  );

  protected readonly inactiveRelationships = computed(() =>
    this.relationships().filter(
      (relationship) =>
        relationship.status === 'DECLINED' ||
        relationship.status === 'CANCELLED' ||
        relationship.status === 'REVOKED',
    ),
  );

  protected acceptInvitation(relationship: PatientCarerAccessResponse): void {
    this.clearMessages();
    this.busyAccessId.set(relationship.id);

    this.accessState
      .acceptInvitation(relationship.id)
      .pipe(
        finalize(() => {
          this.busyAccessId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.selectedPatientState.revalidateSelection();

          this.successMessage.set(`Access to ${this.patientName(relationship)} has been accepted.`);
        },
        error: (error: unknown) => {
          this.errorMessage.set(getHttpErrorMessage(error, 'Unable to accept the invitation.'));
        },
      });
  }

  protected declineInvitation(relationship: PatientCarerAccessResponse): void {
    this.clearMessages();
    this.busyAccessId.set(relationship.id);

    this.accessState
      .declineInvitation(relationship.id)
      .pipe(
        finalize(() => {
          this.busyAccessId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.selectedPatientState.revalidateSelection();

          this.successMessage.set(
            `The invitation from ${this.patientName(relationship)} has been declined.`,
          );
        },
        error: (error: unknown) => {
          this.errorMessage.set(getHttpErrorMessage(error, 'Unable to decline the invitation.'));
        },
      });
  }

  protected openPatient(relationship: PatientCarerAccessResponse): void {
    this.clearMessages();

    const selected = this.selectedPatientState.selectPatient(relationship.patient.patientRecordId);

    if (!selected) {
      this.errorMessage.set('You do not have permission to view this patient record.');

      return;
    }

    void this.router.navigate(['/patient']);
  }

  protected retryLoad(): void {
    this.clearMessages();

    this.contextCoordinator.reloadCarerAccess().subscribe({
      error: (error: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load your patient access.'));
      },
    });
  }

  protected canOpenPatient(relationship: PatientCarerAccessResponse): boolean {
    const context = this.selectedPatientState
      .contexts()
      .find((candidate) => candidate.patientRecordId === relationship.patient.patientRecordId);

    return context !== undefined && this.selectedPatientState.canSelect(context);
  }

  protected patientName(relationship: PatientCarerAccessResponse): string {
    return `${relationship.patient.firstName} ${relationship.patient.lastName}`.trim();
  }

  protected hasPermission(
    relationship: PatientCarerAccessResponse,
    permission: Permission,
  ): boolean {
    return relationship.permissions.includes(permission);
  }

  protected isBusy(accessId: string): boolean {
    return this.busyAccessId() === accessId;
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
