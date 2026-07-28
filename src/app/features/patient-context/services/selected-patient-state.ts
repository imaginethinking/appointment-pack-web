import { computed, inject, Injectable, signal } from '@angular/core';

import { Permission } from '../../../core/models/permission-model';
import { PatientCarerAccessState } from '../../care-network/services/patient-carer-access-state';
import { PersonalPatientRecordState } from '../../patient-record/services/personal-patient-record-state';
import { ProfileState } from '../../profile/services/profile-state';
import { SelectedPatientContext } from '../models/selected-patient-context';
import { PatientContextAuthorisation } from './patient-context-auth';

@Injectable({
  providedIn: 'root',
})
export class SelectedPatientState {
  private readonly profileState = inject(ProfileState);

  private readonly personalPatientRecordState = inject(PersonalPatientRecordState);

  private readonly patientCarerAccessState = inject(PatientCarerAccessState);

  private readonly authorisation = inject(PatientContextAuthorisation);

  private readonly selectedPatientRecordIdKey = 'appointmentPack.selectedPatientRecordId';

  private readonly selectedPatientRecordIdValue = signal<string | null>(null);

  readonly selectedPatientRecordId = this.selectedPatientRecordIdValue.asReadonly();

  readonly contexts = computed<readonly SelectedPatientContext[]>(() => {
    const contexts: SelectedPatientContext[] = [];

    const profile = this.profileState.profile();

    const personalPatientRecord = this.personalPatientRecordState.patientRecord();

    if (profile !== null && personalPatientRecord !== null) {
      contexts.push({
        patientRecordId: personalPatientRecord.id,
        profileId: profile.id,
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        contextType: 'SELF',
        permissions: new Set<Permission>(),
      });
    }

    for (const relationship of this.patientCarerAccessState.asCarerRelationships()) {
      if (relationship.status !== 'ACTIVE') {
        continue;
      }

      contexts.push({
        patientRecordId: relationship.patient.patientRecordId,
        profileId: relationship.patient.profileId,
        userId: relationship.patient.userId,
        firstName: relationship.patient.firstName,
        lastName: relationship.patient.lastName,
        contextType: 'CARER',
        permissions: new Set<Permission>(relationship.permissions),
      });
    }

    return contexts;
  });

  readonly selectedPatient = computed(() => {
    const selectedPatientRecordId = this.selectedPatientRecordIdValue();

    if (selectedPatientRecordId === null) {
      return null;
    }

    return (
      this.contexts().find((context) => context.patientRecordId === selectedPatientRecordId) ?? null
    );
  });

  selectPatient(patientRecordId: string): boolean {
    const context = this.contexts().find(
      (candidate) => candidate.patientRecordId === patientRecordId,
    );

    if (context === undefined || !this.canSelect(context)) {
      return false;
    }

    this.selectedPatientRecordIdValue.set(patientRecordId);

    sessionStorage.setItem(this.selectedPatientRecordIdKey, patientRecordId);

    return true;
  }

  canSelect(context: SelectedPatientContext): boolean {
    return this.authorisation.can(context, 'patient-record', 'view');
  }

  revalidateSelection(): void {
    const contexts = this.contexts();

    const storedPatientRecordId = sessionStorage.getItem(this.selectedPatientRecordIdKey);

    const storedContext = contexts.find(
      (context) => context.patientRecordId === storedPatientRecordId && this.canSelect(context),
    );

    if (storedContext !== undefined) {
      this.selectPatient(storedContext.patientRecordId);

      return;
    }

    const selfContext = contexts.find(
      (context) => context.contextType === 'SELF' && this.canSelect(context),
    );

    if (selfContext !== undefined) {
      this.selectPatient(selfContext.patientRecordId);

      return;
    }

    const firstAccessibleContext = contexts.find((context) => this.canSelect(context));

    if (firstAccessibleContext !== undefined) {
      this.selectPatient(firstAccessibleContext.patientRecordId);

      return;
    }

    this.clearSelection();
  }

  reset(): void {
    this.clearSelection();
  }

  private clearSelection(): void {
    this.selectedPatientRecordIdValue.set(null);

    sessionStorage.removeItem(this.selectedPatientRecordIdKey);
  }
}
