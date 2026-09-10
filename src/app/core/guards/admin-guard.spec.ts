// These tests check the small role-based guard used for administrator pages.
// Spring Boot still provides the real security boundary, but this guard protects the frontend navigation experience.

import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree} from '@angular/router';

import {AuthService} from '../services/auth-service';
import {adminGuard} from './admin-guard';

describe('adminGuard', () => {
  let authService: {
    isAdmin: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  // Creates a fresh admin-role mock and real Angular Router before each test.
  beforeEach(() => {
    authService = {
      isAdmin: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
  });

  // Resets the Angular test module so role state cannot leak between tests.
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // Checks that users with the ADMIN role can enter administrator routes.
  it('allows navigation when the current user is an administrator', () => {
    authService.isAdmin.mockReturnValue(true);

    const result = runGuard();

    expect(result).toBe(true);
  });

  // Checks that normal users are sent to the existing access-denied page.
  it('redirects a non-admin user to access denied', () => {
    authService.isAdmin.mockReturnValue(false);

    const result = runGuard() as UrlTree;

    expect(router.serializeUrl(result)).toBe('/access-denied');
  });

  // Runs the functional guard inside Angular's dependency-injection context.
  function runGuard(): boolean | UrlTree {
    return TestBed.runInInjectionContext(
      () => adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }
});
