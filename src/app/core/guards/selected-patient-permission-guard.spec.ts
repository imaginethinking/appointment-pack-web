// These tests check that patient-scoped routes use the current selected patient and the permission in route data.
// The permission service itself was tested in Phase 11A, so this file only checks the guard's navigation decision.

import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree} from '@angular/router';

import {Permission} from '../models/permission-model';
import {PatientContextAuthorisation} from '../../features/patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../features/patient-context/services/patient-context-coordinator';
import {SelectedPatientContext} from '../../features/patient-context/models/selected-patient-context';
import {SelectedPatientState} from '../../features/patient-context/services/selected-patient-state';
import {selectedPatientPermissionGuard} from './selected-patient-permission-guard';

describe('selectedPatientPermissionGuard', () => {
  const selectedPatient: SelectedPatientContext = {
    patientRecordId: 'patient-1',
    profileId: 'profile-1',
    userId: 'user-1',
    firstName: 'Shared',
    lastName: 'Patient',
    contextType: 'CARER',
    permissions: new Set<Permission>(['patient-record:view', 'medication:view']),
  };

  let authorisation: {
    can: ReturnType<typeof vi.fn>;
  };
  let selectedPatientState: {
    selectedPatient: ReturnType<typeof vi.fn>;
  };
  let patientContextCoordinator: {
    loadFailed: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  // Creates predictable selected-patient and permission services before each guard test.
  beforeEach(() => {
    authorisation = {
      can: vi.fn(),
    };
    selectedPatientState = {
      selectedPatient: vi.fn().mockReturnValue(selectedPatient),
    };
    patientContextCoordinator = {
      loadFailed: vi.fn().mockReturnValue(false),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PatientContextAuthorisation, useValue: authorisation },
        { provide: SelectedPatientState, useValue: selectedPatientState },
        { provide: PatientContextCoordinator, useValue: patientContextCoordinator },
      ],
    });

    router = TestBed.inject(Router);
  });

  // Resets Angular's test module so mocked patient state does not carry into another test.
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // Checks that the guard passes the selected patient and route permission to the central authorisation service.
  it('allows navigation when the selected patient has the required route permission', () => {
    authorisation.can.mockReturnValue(true);

    const result = runGuard({ resource: 'medication', action: 'view' });

    expect(result).toBe(true);
    expect(authorisation.can).toHaveBeenCalledWith(selectedPatient, 'medication', 'view');
  });

  // Checks that failed patient permission checks use the shared access-denied route.
  it('redirects to access denied when the selected patient is not permitted', () => {
    authorisation.can.mockReturnValue(false);

    const result = runGuard({ resource: 'medication', action: 'edit' }) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/access-denied');
    expect(authorisation.can).toHaveBeenCalledWith(selectedPatient, 'medication', 'edit');
  });


  // A context loading failure is a connectivity/state problem, so it should not be presented as a permission denial.
  it('redirects to the dashboard when patient context could not be loaded', () => {
    patientContextCoordinator.loadFailed.mockReturnValue(true);

    const result = runGuard({ resource: 'medication', action: 'view' }) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/home');
    expect(authorisation.can).not.toHaveBeenCalled();
  });

  // Checks that a patient-scoped route cannot silently become unprotected if its permission metadata is missing.
  it('redirects to access denied when the route has no permission requirement', () => {
    const result = runGuard(undefined) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/access-denied');
    expect(authorisation.can).not.toHaveBeenCalled();
  });

  // Builds a minimal route snapshot and runs the functional guard in Angular's injection context.
  function runGuard(permission: { resource: 'medication'; action: 'view' | 'edit' } | undefined): boolean | UrlTree {
    const route = {
      data: permission === undefined ? {} : { permission },
    } as unknown as ActivatedRouteSnapshot;

    return TestBed.runInInjectionContext(
      () => selectedPatientPermissionGuard(route, {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }
});
