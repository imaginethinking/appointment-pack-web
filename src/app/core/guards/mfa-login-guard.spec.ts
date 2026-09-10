// These tests protect the MFA login route so it is only used while a login challenge is actually pending.

import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree} from '@angular/router';

import {AuthService} from '../services/auth-service';
import {mfaLoginGuard} from './mfa-login-guard';

describe('mfaLoginGuard', () => {
  let authService: {
    hasPendingMfaChallenge: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  // Creates a mocked MFA challenge state and a real Angular Router before each test.
  beforeEach(() => {
    authService = {
      hasPendingMfaChallenge: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
  });

  // Resets the test module after each MFA guard test.
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // Checks that the MFA page remains available while the password-login challenge is pending.
  it('allows navigation when an MFA challenge is pending', () => {
    authService.hasPendingMfaChallenge.mockReturnValue(true);

    const result = runGuard();

    expect(result).toBe(true);
  });

  // Checks that directly opening the MFA route without a challenge returns the user to normal login.
  it('redirects to login when there is no pending MFA challenge', () => {
    authService.hasPendingMfaChallenge.mockReturnValue(false);

    const result = runGuard() as UrlTree;

    expect(router.serializeUrl(result)).toBe('/login');
  });

  // Runs the functional guard inside Angular's dependency-injection context.
  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () => mfaLoginGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }
});
