import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { applyServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import {
  addPermissionWithDependencies,
  Permission,
  removePermissionWithDependents,
} from '../../../../core/models/permission-model';
import { PersonalPatientRecordState } from '../../../patient-record/services/personal-patient-record-state';
import { CareNetworkTabs } from '../../components/care-network-tabs/care-network-tabs';
import { PermissionBadges } from '../../components/permission-badges/permission-badges';
import { PermissionSelector } from '../../components/permission-selector/permission-selector';
import { DEFAULT_CARER_PERMISSIONS, PatientCarerAccessResponse } from '../../models/patient-carer-access-model';
import { PatientCarerAccessState } from '../../services/patient-carer-access-state';

@Component({
  selector: 'app-care-network',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, CareNetworkTabs, PermissionBadges, PermissionSelector],
  templateUrl: './care-network.html',
})
export class CareNetwork implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly accessState = inject(PatientCarerAccessState);
  private readonly personalPatientRecordState = inject(PersonalPatientRecordState);
  private readonly invitationPermissionsValue = signal<ReadonlySet<Permission>>(new Set(DEFAULT_CARER_PERMISSIONS));
  private readonly editingPermissionsValue = signal<ReadonlySet<Permission>>(new Set());

  protected readonly personalPatientRecord = this.personalPatientRecordState.patientRecord;
  protected readonly relationships = this.accessState.asPatientRelationships;
  protected readonly isLoading = this.accessState.isLoadingAsPatient;
  protected readonly invitationPermissions = this.invitationPermissionsValue.asReadonly();
  protected readonly editingPermissions = this.editingPermissionsValue.asReadonly();
  protected readonly isInviting = signal(false);
  protected readonly editingAccessId = signal<string | null>(null);
  protected readonly busyAccessId = signal<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly pendingRelationships = computed(() => this.relationships().filter((relationship) => relationship.status === 'PENDING'));
  protected readonly activeRelationships = computed(() => this.relationships().filter((relationship) => relationship.status === 'ACTIVE'));
  protected readonly inactiveRelationships = computed(() => this.relationships().filter(
    (relationship) => relationship.status === 'DECLINED' || relationship.status === 'CANCELLED' || relationship.status === 'REVOKED',
  ));

  protected readonly invitationForm = this.formBuilder.group({
    carerEmail: this.formBuilder.nonNullable.control('', [Validators.required, Validators.email]),
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

    this.accessState.inviteCarer({
      carerEmail: value.carerEmail.trim(),
      permissions: [...this.invitationPermissions()],
    }).pipe(
      finalize(() => this.isInviting.set(false)),
    ).subscribe({
      next: () => {
        this.invitationForm.reset({ carerEmail: '' });
        this.invitationPermissionsValue.set(new Set(DEFAULT_CARER_PERMISSIONS));
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
          this.errorMessage.set('A pending or active relationship already exists for this carer.');
          return;
        }

        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to create the carer invitation.'));
      },
    });
  }

  protected toggleInvitationPermission(permission: Permission, checked: boolean): void {
    this.invitationPermissionsValue.set(this.updatePermissionSelection(this.invitationPermissions(), permission, checked));
  }

  protected startPermissionEdit(relationship: PatientCarerAccessResponse): void {
    this.clearMessages();
    this.editingPermissionsValue.set(new Set(relationship.permissions));
    this.editingAccessId.set(relationship.id);
  }

  protected toggleEditingPermission(permission: Permission, checked: boolean): void {
    this.editingPermissionsValue.set(this.updatePermissionSelection(this.editingPermissions(), permission, checked));
  }

  protected cancelPermissionEdit(): void {
    this.editingAccessId.set(null);
    this.editingPermissionsValue.set(new Set());
  }

  protected savePermissions(): void {
    const accessId = this.editingAccessId();

    if (accessId === null) {
      return;
    }

    this.clearMessages();
    this.busyAccessId.set(accessId);

    this.accessState.updatePermissions(accessId, {
      permissions: [...this.editingPermissions()],
    }).pipe(
      finalize(() => this.busyAccessId.set(null)),
    ).subscribe({
      next: () => {
        this.editingAccessId.set(null);
        this.editingPermissionsValue.set(new Set());
        this.successMessage.set('Carer permissions have been updated.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to update carer permissions.'));
      },
    });
  }

  protected cancelInvitation(relationship: PatientCarerAccessResponse): void {
    if (!window.confirm(`Cancel the invitation for ${this.relationshipName(relationship)}?`)) {
      return;
    }

    this.clearMessages();
    this.busyAccessId.set(relationship.id);

    this.accessState.cancelInvitation(relationship.id).pipe(
      finalize(() => this.busyAccessId.set(null)),
    ).subscribe({
      next: () => this.successMessage.set('The pending invitation has been cancelled.'),
      error: (error: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to cancel the invitation.'));
      },
    });
  }

  protected revokeAccess(relationship: PatientCarerAccessResponse): void {
    if (!window.confirm(`Revoke access for ${this.relationshipName(relationship)}?`)) {
      return;
    }

    this.clearMessages();
    this.busyAccessId.set(relationship.id);

    this.accessState.revokeAccess(relationship.id).pipe(
      finalize(() => this.busyAccessId.set(null)),
    ).subscribe({
      next: () => this.successMessage.set('The carer’s access has been revoked.'),
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

  protected isBusy(accessId: string): boolean {
    return this.busyAccessId() === accessId;
  }

  private updatePermissionSelection(selectedPermissions: ReadonlySet<Permission>, permission: Permission, checked: boolean): ReadonlySet<Permission> {
    return checked
      ? addPermissionWithDependencies(selectedPermissions, permission)
      : removePermissionWithDependents(selectedPermissions, permission);
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
