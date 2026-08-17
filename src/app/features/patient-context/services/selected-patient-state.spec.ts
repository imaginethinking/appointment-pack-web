// SelectedPatientState decides which patient the rest of the application is working with.
// These tests mainly protect refresh persistence and the fallback behaviour when access changes.

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Permission } from '../../../core/models/permission-model';
import { PatientCarerAccessResponse } from '../../care-network/models/patient-carer-access-model';
import { PatientCarerAccessState } from '../../care-network/services/patient-carer-access-state';
import { PatientRecordResponse } from '../../patient-record/models/patient-record-model';
import { PersonalPatientRecordState } from '../../patient-record/services/personal-patient-record-state';
import { ProfileResponse } from '../../profile/models/profile-model';
import { ProfileState } from '../../profile/services/profile-state';
import { PatientContextAuthorisation } from './patient-context-auth';
import { SelectedPatientState } from './selected-patient-state';

describe('SelectedPatientState', () => {
  const storageKey = 'appointmentPack.selectedPatientRecordId';

  // Signals are used here because the real state services expose reactive values in the same way.
  const profile = signal<ProfileResponse | null>(null);
  const personalPatientRecord = signal<PatientRecordResponse | null>(null);
  const asCarerRelationships = signal<readonly PatientCarerAccessResponse[]>([]);

  // Resets the fake profile, patient and carer state before each selection test.
  beforeEach(() => {
    sessionStorage.clear();
    profile.set(null);
    personalPatientRecord.set(null);
    asCarerRelationships.set([]);

    // Only the state values needed by SelectedPatientState are provided; no HTTP calls are required.
    TestBed.configureTestingModule({
      providers: [
        SelectedPatientState,
        PatientContextAuthorisation,
        {
          provide: ProfileState,
          useValue: { profile: profile.asReadonly() },
        },
        {
          provide: PersonalPatientRecordState,
          useValue: { patientRecord: personalPatientRecord.asReadonly() },
        },
        {
          provide: PatientCarerAccessState,
          useValue: { asCarerRelationships: asCarerRelationships.asReadonly() },
        },
      ],
    });
  });

  // Removes stored selection data and resets Angular testing after each test.
  afterEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  // Checks that refreshing the browser keeps the same shared patient when access is still valid.
  it('restores a persisted shared patient when that context is still accessible', () => {
    profile.set(createProfile());
    personalPatientRecord.set(createPatientRecord('self-record'));
    asCarerRelationships.set([
      createCarerRelationship('shared-record', ['patient-record:view', 'document:view']),
    ]);
    // This simulates a browser refresh after the user previously selected a shared patient.
    sessionStorage.setItem(storageKey, 'shared-record');

    const state = TestBed.inject(SelectedPatientState);
    state.revalidateSelection();

    expect(state.selectedPatientRecordId()).toBe('shared-record');
    expect(state.selectedPatient()?.contextType).toBe('CARER');
    expect(sessionStorage.getItem(storageKey)).toBe('shared-record');
  });

  // Checks that an old saved patient ID is replaced by the user's own record when possible.
  it('falls back to the personal patient record when the persisted selection is stale', () => {
    profile.set(createProfile());
    personalPatientRecord.set(createPatientRecord('self-record'));
    asCarerRelationships.set([
      createCarerRelationship('shared-record', ['patient-record:view']),
    ]);
    sessionStorage.setItem(storageKey, 'removed-record');

    const state = TestBed.inject(SelectedPatientState);
    state.revalidateSelection();

    expect(state.selectedPatientRecordId()).toBe('self-record');
    expect(state.selectedPatient()?.contextType).toBe('SELF');
    expect(sessionStorage.getItem(storageKey)).toBe('self-record');
  });

  // Checks the fallback used for a carer who does not yet have their own patient record.
  it('falls back to the first accessible shared patient when no personal patient record exists', () => {
    profile.set(createProfile());
    personalPatientRecord.set(null);
    asCarerRelationships.set([
      createCarerRelationship('shared-record-1', ['patient-record:view']),
      createCarerRelationship('shared-record-2', ['patient-record:view', 'appointment:view']),
    ]);

    const state = TestBed.inject(SelectedPatientState);
    state.revalidateSelection();

    expect(state.selectedPatientRecordId()).toBe('shared-record-1');
    expect(state.selectedPatient()?.contextType).toBe('CARER');
  });

  // Checks that only active relationships with patient-record:view become selectable patients.
  it('does not expose inactive or insufficiently-permitted carer relationships as selectable contexts', () => {
    asCarerRelationships.set([
      createCarerRelationship('pending-record', ['patient-record:view'], 'PENDING'),
      createCarerRelationship('missing-view-record', ['document:view']),
      createCarerRelationship('active-record', ['patient-record:view']),
    ]);

    const state = TestBed.inject(SelectedPatientState);

    expect(state.contexts().map((context) => context.patientRecordId)).toEqual(['active-record']);
    expect(state.selectPatient('pending-record')).toBe(false);
    expect(state.selectPatient('missing-view-record')).toBe(false);
  });

  // Checks that revoked access cannot leave the previous shared patient selected.
  it('revalidates a selected shared patient after access is removed and falls back to self', () => {
    profile.set(createProfile());
    personalPatientRecord.set(createPatientRecord('self-record'));
    asCarerRelationships.set([
      createCarerRelationship('shared-record', ['patient-record:view', 'document:view']),
    ]);

    const state = TestBed.inject(SelectedPatientState);
    expect(state.selectPatient('shared-record')).toBe(true);

    // The selected patient is revoked after it was already being used. Revalidation should move back to self.
    asCarerRelationships.set([
      createCarerRelationship('shared-record', ['patient-record:view', 'document:view'], 'REVOKED'),
    ]);
    state.revalidateSelection();

    expect(state.selectedPatientRecordId()).toBe('self-record');
    expect(state.selectedPatient()?.contextType).toBe('SELF');
  });

  // Checks that losing the basic view permission also forces selection onto another valid patient.
  it('revalidates a selected shared patient when patient-record view permission is removed', () => {
    profile.set(createProfile());
    personalPatientRecord.set(null);
    asCarerRelationships.set([
      createCarerRelationship('shared-record-1', ['patient-record:view', 'document:view']),
      createCarerRelationship('shared-record-2', ['patient-record:view']),
    ]);

    const state = TestBed.inject(SelectedPatientState);
    expect(state.selectPatient('shared-record-1')).toBe(true);

    asCarerRelationships.set([
      createCarerRelationship('shared-record-1', ['document:view']),
      createCarerRelationship('shared-record-2', ['patient-record:view']),
    ]);
    state.revalidateSelection();

    expect(state.selectedPatientRecordId()).toBe('shared-record-2');
  });

  // Checks that stale browser state is removed when there is no valid patient to fall back to.
  it('clears the persisted selection when there are no accessible patient contexts', () => {
    sessionStorage.setItem(storageKey, 'stale-record');

    const state = TestBed.inject(SelectedPatientState);
    state.revalidateSelection();

    expect(state.selectedPatientRecordId()).toBeNull();
    expect(state.selectedPatient()).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  // Checks that a user's manual patient choice is saved for the next refresh.
  it('persists an explicitly selected accessible patient', () => {
    profile.set(createProfile());
    personalPatientRecord.set(createPatientRecord('self-record'));
    asCarerRelationships.set([
      createCarerRelationship('shared-record', ['patient-record:view']),
    ]);

    const state = TestBed.inject(SelectedPatientState);

    expect(state.selectPatient('shared-record')).toBe(true);
    expect(state.selectedPatientRecordId()).toBe('shared-record');
    expect(sessionStorage.getItem(storageKey)).toBe('shared-record');
  });

  // Checks that logout/reset behaviour clears the selected patient from browser storage.
  it('removes persisted patient selection on reset', () => {
    profile.set(createProfile());
    personalPatientRecord.set(createPatientRecord('self-record'));
    const state = TestBed.inject(SelectedPatientState);
    state.revalidateSelection();

    state.reset();

    expect(state.selectedPatientRecordId()).toBeNull();
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });
});

// Creates the signed-in user's profile used by the selected-patient tests.
function createProfile(): ProfileResponse {
  return {
    id: 'self-profile',
    userId: 'self-user',
    firstName: 'Self',
    lastName: 'Patient',
    dateOfBirth: '1990-01-01',
    gender: null,
    address: null,
  };
}

// Creates a minimal personal patient record with the ID needed by each test.
function createPatientRecord(id: string): PatientRecordResponse {
  return {
    id,
    profileId: 'self-profile',
    nhsNumber: null,
    chiNumber: null,
    hcNumber: null,
    height: null,
    heightUnit: null,
    weight: null,
    weightUnit: null,
    bmi: null,
    bloodType: null,
  };
}

// Creates a carer relationship so tests can vary the shared patient, permissions and status.
function createCarerRelationship(
  patientRecordId: string,
  permissions: readonly Permission[],
  status: PatientCarerAccessResponse['status'] = 'ACTIVE',
): PatientCarerAccessResponse {
  return {
    id: `relationship-${patientRecordId}`,
    patient: {
      patientRecordId,
      userId: `user-${patientRecordId}`,
      profileId: `profile-${patientRecordId}`,
      firstName: 'Shared',
      lastName: patientRecordId,
    },
    carer: {
      userId: 'self-user',
      profileId: 'self-profile',
      firstName: 'Self',
      lastName: 'Patient',
      email: 'self@example.com',
    },
    status,
    permissions: [...permissions],
    invitedAt: '2026-08-01T12:00:00Z',
    statusChangedAt: '2026-08-02T12:00:00Z',
  };
}
