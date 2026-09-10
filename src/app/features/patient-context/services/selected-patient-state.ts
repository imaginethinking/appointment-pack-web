import {computed, inject, Injectable, signal} from '@angular/core';

import {Permission} from '../../../core/models/permission-model';
import {PatientCarerAccessState} from '../../care-network/services/patient-carer-access-state';
import {PersonalPatientRecordState} from '../../patient-record/services/personal-patient-record-state';
import {ProfileState} from '../../profile/services/profile-state';
import {SelectedPatientContext} from '../models/selected-patient-context';
import {PatientContextAuthorisation} from './patient-context-auth';

/**
 * Keeps the available patient contexts and the patient currently selected by the user.
 */
@Injectable({
  providedIn: 'root',
})
export class SelectedPatientState {
  private readonly profileState = inject(ProfileState);
  private readonly personalPatientRecordState = inject(PersonalPatientRecordState);
  private readonly patientCarerAccessState = inject(PatientCarerAccessState);
  private readonly authorisation = inject(PatientContextAuthorisation);

  private readonly selectedPatientRecordIdKey = 'appointmentPack.selectedPatientRecordId';
  private readonly selectedPatientRecordIdValue = signal<string | null>(
    sessionStorage.getItem(this.selectedPatientRecordIdKey),
  );

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
      if (relationship.status !== 'ACTIVE' || !relationship.permissions.includes('patient-record:view')) {
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

  readonly selectedPatient = computed<SelectedPatientContext | null>(() => {
    const selectedPatientRecordId = this.selectedPatientRecordIdValue();

    if (selectedPatientRecordId === null) {
      return null;
    }

    return this.contexts().find((context) => context.patientRecordId === selectedPatientRecordId) ?? null;
  }, {
    equal: selectedPatientContextEqual,
  });

  /**
   * Selects an available patient and saves the choice for the current browser session.
   */
  selectPatient(patientRecordId: string): boolean {
    const context = this.contexts().find((candidate) => candidate.patientRecordId === patientRecordId);

    if (context === undefined || !this.canSelect(context)) {
      return false;
    }

    this.selectedPatientRecordIdValue.set(patientRecordId);
    sessionStorage.setItem(this.selectedPatientRecordIdKey, patientRecordId);
    return true;
  }

  /**
   * Checks whether the patient context can be opened.
   */
  canSelect(context: SelectedPatientContext): boolean {
    return this.authorisation.can(context, 'patient-record', 'view');
  }

  /**
   * Keeps the current patient selected when possible and chooses another available patient when access has changed.
   */
  revalidateSelection(): void {
    const contexts = this.contexts();
    const preferredPatientRecordId = this.selectedPatientRecordIdValue();

    const preferredContext = contexts.find(
      (context) => context.patientRecordId === preferredPatientRecordId && this.canSelect(context),
    );

    if (preferredContext !== undefined) {
      this.selectPatient(preferredContext.patientRecordId);
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

  /**
   * Clears the current patient selection.
   */
  reset(): void {
    this.clearSelection();
  }

  /**
   * Removes the selected patient from the state and browser session.
   */
  private clearSelection(): void {
    this.selectedPatientRecordIdValue.set(null);
    sessionStorage.removeItem(this.selectedPatientRecordIdKey);
  }
}

/**
 * Checks whether two patient contexts contain the same patient details and permissions.
 */
function selectedPatientContextEqual(previous: SelectedPatientContext | null, current: SelectedPatientContext | null): boolean {
  if (previous === current) {
    return true;
  }

  if (previous === null || current === null) {
    return false;
  }

  return previous.patientRecordId === current.patientRecordId
    && previous.profileId === current.profileId
    && previous.userId === current.userId
    && previous.firstName === current.firstName
    && previous.lastName === current.lastName
    && previous.contextType === current.contextType
    && permissionSetsEqual(previous.permissions, current.permissions);
}

/**
 * Checks whether two permission sets contain the same permissions.
 */
function permissionSetsEqual(previous: ReadonlySet<Permission>, current: ReadonlySet<Permission>): boolean {
  if (previous.size !== current.size) {
    return false;
  }

  for (const permission of previous) {
    if (!current.has(permission)) {
      return false;
    }
  }

  return true;
}
