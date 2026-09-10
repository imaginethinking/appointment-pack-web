// PatientContextCoordinator joins several existing state services together during application startup.
// These tests check that loading stays coordinated and that patient selection is revalidated when access changes.

import {TestBed} from '@angular/core/testing';
import {firstValueFrom, of, Subject, throwError} from 'rxjs';

import {PatientCarerAccessState} from '../../care-network/services/patient-carer-access-state';
import {PersonalPatientRecordState} from '../../patient-record/services/personal-patient-record-state';
import {ProfileState} from '../../profile/services/profile-state';
import {PatientContextCoordinator} from './patient-context-coordinator';
import {SelectedPatientState} from './selected-patient-state';

describe('PatientContextCoordinator', () => {
  let profileState: {
    loadCurrentProfile: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let personalPatientRecordState: {
    loadCurrentPatientRecord: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let patientCarerAccessState: {
    loadAsCarer: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let selectedPatientState: {
    revalidateSelection: ReturnType<typeof vi.fn>;
    selectedPatientRecordId: ReturnType<typeof vi.fn>;
    selectedPatient: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };

  // Creates successful state-service responses by default so each test only changes what it needs.
  beforeEach(() => {
    profileState = {
      loadCurrentProfile: vi.fn().mockReturnValue(of({ id: 'profile-1' })),
      reset: vi.fn(),
    };
    personalPatientRecordState = {
      loadCurrentPatientRecord: vi.fn().mockReturnValue(of(null)),
      reset: vi.fn(),
    };
    patientCarerAccessState = {
      loadAsCarer: vi.fn().mockReturnValue(of([])),
      reset: vi.fn(),
    };
    selectedPatientState = {
      revalidateSelection: vi.fn(),
      selectedPatientRecordId: vi.fn().mockReturnValue(null),
      selectedPatient: vi.fn().mockReturnValue(null),
      reset: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        PatientContextCoordinator,
        { provide: ProfileState, useValue: profileState },
        { provide: PersonalPatientRecordState, useValue: personalPatientRecordState },
        { provide: PatientCarerAccessState, useValue: patientCarerAccessState },
        { provide: SelectedPatientState, useValue: selectedPatientState },
      ],
    });
  });

  // Resets dependency injection after each coordinator test.
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // Checks that the initial load waits for all three state sources before revalidating the selected patient.
  it('loads profile, personal patient record and carer access before marking context as loaded', async () => {
    const coordinator = TestBed.inject(PatientContextCoordinator);

    await firstValueFrom(coordinator.load());

    expect(profileState.loadCurrentProfile).toHaveBeenCalledTimes(1);
    expect(personalPatientRecordState.loadCurrentPatientRecord).toHaveBeenCalledTimes(1);
    expect(patientCarerAccessState.loadAsCarer).toHaveBeenCalledTimes(1);
    expect(selectedPatientState.revalidateSelection).toHaveBeenCalledTimes(1);
    expect(coordinator.isLoaded()).toBe(true);
    expect(coordinator.isLoading()).toBe(false);
    expect(coordinator.loadFailed()).toBe(false);
  });

  // Checks that two parts of the app asking for context at the same time share one set of requests.
  it('deduplicates concurrent initial patient-context loads', async () => {
    const profileSubject = new Subject<unknown>();
    const patientSubject = new Subject<unknown>();
    const carerSubject = new Subject<unknown>();
    profileState.loadCurrentProfile.mockReturnValue(profileSubject);
    personalPatientRecordState.loadCurrentPatientRecord.mockReturnValue(patientSubject);
    patientCarerAccessState.loadAsCarer.mockReturnValue(carerSubject);

    const coordinator = TestBed.inject(PatientContextCoordinator);
    const firstLoad = firstValueFrom(coordinator.load());
    const secondLoad = firstValueFrom(coordinator.load());

    expect(profileState.loadCurrentProfile).toHaveBeenCalledTimes(1);
    expect(personalPatientRecordState.loadCurrentPatientRecord).toHaveBeenCalledTimes(1);
    expect(patientCarerAccessState.loadAsCarer).toHaveBeenCalledTimes(1);
    expect(coordinator.isLoading()).toBe(true);

    profileSubject.next({});
    profileSubject.complete();
    patientSubject.next(null);
    patientSubject.complete();
    carerSubject.next([]);
    carerSubject.complete();

    await Promise.all([firstLoad, secondLoad]);

    expect(selectedPatientState.revalidateSelection).toHaveBeenCalledTimes(1);
    expect(coordinator.isLoaded()).toBe(true);
    expect(coordinator.isLoading()).toBe(false);
  });

  // Checks that once initial context is loaded, later calls do not unnecessarily reload the same data.
  it('reuses the loaded patient context on later load calls', async () => {
    const coordinator = TestBed.inject(PatientContextCoordinator);

    await firstValueFrom(coordinator.load());
    await firstValueFrom(coordinator.load());

    expect(profileState.loadCurrentProfile).toHaveBeenCalledTimes(1);
    expect(personalPatientRecordState.loadCurrentPatientRecord).toHaveBeenCalledTimes(1);
    expect(patientCarerAccessState.loadAsCarer).toHaveBeenCalledTimes(1);
  });

  // Checks that a failed initial request is recorded and leaves the coordinator available for a later retry.
  it('records an initial load failure and allows the load to be retried', async () => {
    profileState.loadCurrentProfile.mockReturnValueOnce(
      throwError(() => new Error('Profile unavailable')),
    );

    const coordinator = TestBed.inject(PatientContextCoordinator);

    await expect(firstValueFrom(coordinator.load())).rejects.toThrow('Profile unavailable');

    expect(coordinator.isLoaded()).toBe(false);
    expect(coordinator.isLoading()).toBe(false);
    expect(coordinator.loadFailed()).toBe(true);

    await firstValueFrom(coordinator.load());

    expect(profileState.loadCurrentProfile).toHaveBeenCalledTimes(2);
    expect(coordinator.isLoaded()).toBe(true);
    expect(coordinator.loadFailed()).toBe(false);
  });

  // Checks that refreshing carer access also revalidates whether the selected patient is still available.
  it('revalidates patient selection after reloading carer access', async () => {
    const coordinator = TestBed.inject(PatientContextCoordinator);

    await firstValueFrom(coordinator.reloadCarerAccess());

    expect(patientCarerAccessState.loadAsCarer).toHaveBeenCalledTimes(1);
    expect(selectedPatientState.revalidateSelection).toHaveBeenCalledTimes(1);
    expect(coordinator.isLoading()).toBe(false);
  });

  // Checks that no access refresh is needed when there is no selected patient or the selected record is the user's own.
  it.each([
    ['no selected patient', null, null],
    ['the personal patient record is selected', 'self-record', { contextType: 'SELF' }],
  ])('does not reload carer access when %s', async (_description, patientRecordId, selectedPatient) => {
    selectedPatientState.selectedPatientRecordId.mockReturnValue(patientRecordId);
    selectedPatientState.selectedPatient.mockReturnValue(selectedPatient);

    const coordinator = TestBed.inject(PatientContextCoordinator);

    await firstValueFrom(coordinator.refreshSelectedPatientAccess());

    expect(patientCarerAccessState.loadAsCarer).not.toHaveBeenCalled();
    expect(selectedPatientState.revalidateSelection).not.toHaveBeenCalled();
  });

  // Checks that a shared patient triggers a fresh carer-access check after a possible stale 403 or 404 response.
  it('reloads carer access when refreshing a selected shared patient', async () => {
    selectedPatientState.selectedPatientRecordId.mockReturnValue('shared-record');
    selectedPatientState.selectedPatient.mockReturnValue({ contextType: 'CARER' });

    const coordinator = TestBed.inject(PatientContextCoordinator);

    await firstValueFrom(coordinator.refreshSelectedPatientAccess());

    expect(patientCarerAccessState.loadAsCarer).toHaveBeenCalledTimes(1);
    expect(selectedPatientState.revalidateSelection).toHaveBeenCalledTimes(1);
  });

  // Checks that logout/reset clears each source state as well as the coordinator's own status flags.
  it('resets all patient-context state', async () => {
    const coordinator = TestBed.inject(PatientContextCoordinator);
    await firstValueFrom(coordinator.load());

    coordinator.reset();

    expect(profileState.reset).toHaveBeenCalledTimes(1);
    expect(personalPatientRecordState.reset).toHaveBeenCalledTimes(1);
    expect(patientCarerAccessState.reset).toHaveBeenCalledTimes(1);
    expect(selectedPatientState.reset).toHaveBeenCalledTimes(1);
    expect(coordinator.isLoading()).toBe(false);
    expect(coordinator.isLoaded()).toBe(false);
    expect(coordinator.loadFailed()).toBe(false);
  });
});
