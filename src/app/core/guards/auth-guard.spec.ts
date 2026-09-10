// These tests check the main signed-in route guard.
// The real AuthService is replaced with a small mock so the tests only focus on the navigation decision.

import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree} from '@angular/router';

import {AuthService} from '../services/auth-service';
import {authGuard} from './auth-guard';

describe('authGuard', () => {
  let authService: {
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  // Creates a fresh guard test setup with a mocked authentication state before each test.
  beforeEach(() => {
    authService = {
      isAuthenticated: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });

    router = TestBed.inject(Router);
  });

  // Resets Angular's test dependency injection after each guard test.
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // Checks that an authenticated user is allowed to continue to the requested route.
  it('allows navigation when the user is authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = runGuard('/documents');

    expect(result).toBe(true);
  });

  // Checks that a signed-out user is sent to login and the original URL is kept for later navigation.
  it('redirects an unauthenticated user to login with the requested return URL', () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = runGuard('/documents/upload') as UrlTree;

    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fdocuments%2Fupload');
  });

  // Runs the functional guard inside Angular's injection context, which is how it receives its services.
  function runGuard(url: string): boolean | UrlTree {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;

    return TestBed.runInInjectionContext(() => authGuard(route, state)) as boolean | UrlTree;
  }
});
