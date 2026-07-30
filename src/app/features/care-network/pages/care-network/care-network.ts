import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { applyServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { Permission } from '../../../../core/models/permission-model';
import { PersonalPatientRecordState } from '../../../patient-record/services/personal-patient-record-state';
import { PatientCarerAccessResponse } from '../../models/patient-carer-access-model';
import { PatientCarerAccessState } from '../../services/patient-carer-access-state';

@Component({
  selector: 'app-care-network',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './care-network.html',
  styleUrl: './care-network.css',
})
export class CareNetwork implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  private readonly accessState = inject(PatientCarerAccessState);

  private readonly personalPatientRecordState = inject(PersonalPatientRecordState);

  protected readonly personalPatientRecord = this.personalPatientRecordState.patientRecord;

  protected readonly relationships = this.accessState.asPatientRelationships;

  protected readonly isLoading = this.accessState.isLoadingAsPatient;

  protected readonly isInviting = signal(false);
  protected readonly editingAccessId = signal<string | null>(null);
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

  protected readonly invitationForm = this.formBuilder.group({
    carerEmail: this.formBuilder.nonNullable.control('', [Validators.required, Validators.email]),
    canViewPatientRecord: this.formBuilder.nonNullable.control(true),
    canEditPatientRecord: this.formBuilder.nonNullable.control(false),
  });

  protected readonly permissionForm = this.formBuilder.group({
    canViewPatientRecord: this.formBuilder.nonNullable.control(false),
    canEditPatientRecord: this.formBuilder.nonNullable.control(false),
  });

  ngOnInit(): void {
    if (this.personalPatientRecord() !== null) {
      this.loadRelationships();
    }
  }

  protected inviteCarer(): void {
    this.clearMessages();

    if (this.invitationForm.invalid) {
      this.invitationForm.markAllAsTouched();
      return;
    }

    const value = this.invitationForm.getRawValue();

    this.isInviting.set(true);

    this.accessState
      .inviteCarer({
        carerEmail: value.carerEmail.trim(),
        permissions: this.buildPermissions(value.canViewPatientRecord, value.canEditPatientRecord),
      })
      .pipe(
        finalize(() => {
          this.isInviting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.invitationForm.reset({
            carerEmail: '',
            canViewPatientRecord: true,
            canEditPatientRecord: false,
          });

          this.successMessage.set('The carer invitation has been created.');
        },
        error: (error: unknown) => {
          if (applyServerFieldErrors(this.invitationForm, error)) {
            return;
          }

          if (hasHttpStatus(error, 404)) {
            this.errorMessage.set('No registered account was found for that email address.');
            return;
          }

          if (hasHttpStatus(error, 409)) {
            this.errorMessage.set(
              'A pending or active relationship already exists for this carer.',
            );
            return;
          }

          this.errorMessage.set(
            getHttpErrorMessage(error, 'Unable to create the carer invitation.'),
          );
        },
      });
  }

  protected startPermissionEdit(relationship: PatientCarerAccessResponse): void {
    this.clearMessages();

    const canEdit = this.hasPermission(relationship, this.patientRecordEditPermission);

    this.permissionForm.reset({
      canViewPatientRecord:
        canEdit || this.hasPermission(relationship, this.patientRecordViewPermission),
      canEditPatientRecord: canEdit,
    });

    this.editingAccessId.set(relationship.id);
  }

  protected cancelPermissionEdit(): void {
    this.editingAccessId.set(null);
  }

  protected savePermissions(): void {
    const accessId = this.editingAccessId();

    if (accessId === null) {
      return;
    }

    this.clearMessages();

    const value = this.permissionForm.getRawValue();

    this.busyAccessId.set(accessId);

    this.accessState
      .updatePermissions(accessId, {
        permissions: this.buildPermissions(value.canViewPatientRecord, value.canEditPatientRecord),
      })
      .pipe(
        finalize(() => {
          this.busyAccessId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.editingAccessId.set(null);

          this.successMessage.set('Carer permissions have been updated.');
        },
        error: (error: unknown) => {
          this.errorMessage.set(getHttpErrorMessage(error, 'Unable to update carer permissions.'));
        },
      });
  }

  protected cancelInvitation(relationship: PatientCarerAccessResponse): void {
    const confirmed = window.confirm(
      `Cancel the invitation for ${this.relationshipName(relationship)}?`,
    );

    if (!confirmed) {
      return;
    }

    this.clearMessages();
    this.busyAccessId.set(relationship.id);

    this.accessState
      .cancelInvitation(relationship.id)
      .pipe(
        finalize(() => {
          this.busyAccessId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage.set('The pending invitation has been cancelled.');
        },
        error: (error: unknown) => {
          this.errorMessage.set(getHttpErrorMessage(error, 'Unable to cancel the invitation.'));
        },
      });
  }

  protected revokeAccess(relationship: PatientCarerAccessResponse): void {
    const confirmed = window.confirm(`Revoke access for ${this.relationshipName(relationship)}?`);

    if (!confirmed) {
      return;
    }

    this.clearMessages();
    this.busyAccessId.set(relationship.id);

    this.accessState
      .revokeAccess(relationship.id)
      .pipe(
        finalize(() => {
          this.busyAccessId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage.set('The carer’s access has been revoked.');
        },
        error: (error: unknown) => {
          this.errorMessage.set(getHttpErrorMessage(error, 'Unable to revoke carer access.'));
        },
      });
  }

  protected loadRelationships(): void {
    this.clearMessages();

    this.accessState.loadAsPatient().subscribe({
      error: (error: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load your care network.'));
      },
    });
  }

  protected relationshipName(relationship: PatientCarerAccessResponse): string {
    return `${relationship.carer.firstName} ${relationship.carer.lastName}`.trim();
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

  private buildPermissions(canView: boolean, canEdit: boolean): Permission[] {
    const permissions: Permission[] = [];

    if (canView || canEdit) {
      permissions.push(this.patientRecordViewPermission);
    }

    if (canEdit) {
      permissions.push(this.patientRecordEditPermission);
    }

    return permissions;
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
