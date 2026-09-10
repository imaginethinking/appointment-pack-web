// This small test checks the normal patient-context loading path before authenticated routes are entered.
// The known load-failure UX is deliberately not locked into a test because it is planned for final hardening.

import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {firstValueFrom, Observable, of} from 'rxjs';

import {PatientContextCoordinator} from '../../features/patient-context/services/patient-context-coordinator';
import {patientContextLoadGuard} from './patient-context-load-guard';

describe('patientContextLoadGuard', () => {
  let coordinator: {
    load: ReturnType<typeof vi.fn>;
  };

  // Provides the guard with a successful fake patient-context load before each test.
  beforeEach(() => {
    coordinator = {
      load: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PatientContextCoordinator, useValue: coordinator },
      ],
    });
  });

  // Resets Angular's test module after the guard test has finished.
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // Checks that the guard waits for the coordinator and then allows normal navigation to continue.
  it('loads patient context before allowing navigation', async () => {
    const result = TestBed.runInInjectionContext(
      () => patientContextLoadGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Observable<boolean>;

    await expect(firstValueFrom(result)).resolves.toBe(true);
    expect(coordinator.load).toHaveBeenCalledTimes(1);
  });
});
