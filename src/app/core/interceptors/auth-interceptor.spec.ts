// These tests check the shared HTTP authentication behaviour used across the application.
// HttpTestingController lets the request reach Angular's HTTP layer without making a real network call.

import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';

import {environment} from '../../../environments/environment';
import {AuthService} from '../services/auth-service';
import {authInterceptor} from './auth-interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let router: Router;
  let authService: {
    getAccessToken: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  // Builds Angular's real HTTP testing pipeline with the production interceptor and a mocked AuthService.
  beforeEach(() => {
    authService = {
      getAccessToken: vi.fn().mockReturnValue('test-access-token'),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  // Confirms every expected request was handled and resets Angular's test module afterwards.
  afterEach(() => {
    httpTesting.verify();
    TestBed.resetTestingModule();
  });

  // Checks that normal Spring API requests carry the current bearer token when one is available.
  it('adds the bearer token to authenticated API requests', () => {
    http.get(`${environment.apiBaseUrl}/profiles/me`).subscribe();

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/profiles/me`);

    expect(request.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    request.flush({});
  });

  // Checks that password login is not given an old bearer token from a previous browser session.
  it('does not add authentication to public auth requests', () => {
    http.post(`${environment.apiBaseUrl}/auth/login`, {}).subscribe();

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/auth/login`);

    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(authService.getAccessToken).not.toHaveBeenCalled();
    request.flush({});
  });

  // Checks that requests outside the Spring API are left untouched by the application interceptor.
  it('does not add authentication to non-API requests', () => {
    http.get('/assets/example.json').subscribe();

    const request = httpTesting.expectOne('/assets/example.json');

    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(authService.getAccessToken).not.toHaveBeenCalled();
    request.flush({});
  });

  // Checks that an unexpected authenticated 401 clears local session state and returns the user to login.
  it('logs out and redirects after a 401 from an authenticated API request', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    let receivedStatus: number | null = null;

    http.get(`${environment.apiBaseUrl}/profiles/me`).subscribe({
      error: (error: { status: number }) => {
        receivedStatus = error.status;
      },
    });

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/profiles/me`);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(receivedStatus).toBe(401);
    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  // Checks that a normal login failure does not trigger global logout handling or another redirect to login.
  it('does not run session-invalidating 401 handling for public auth requests', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.post(`${environment.apiBaseUrl}/auth/login`, {}).subscribe({ error: () => undefined });

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/auth/login`);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  // Checks that telemetry can use the bearer token when signed in, just like the production application.
  it('uses optional authentication for page telemetry when a token is available', () => {
    http.post(`${environment.apiBaseUrl}/analytics/page-views`, { page: 'DASHBOARD' }).subscribe();

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/analytics/page-views`);

    expect(request.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  // Checks that telemetry errors never invalidate a valid login session or interfere with navigation.
  it('does not log out or redirect when page telemetry returns 401', () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    http.post(`${environment.apiBaseUrl}/analytics/page-views`, { page: 'LANDING' }).subscribe({
      error: () => undefined,
    });

    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/analytics/page-views`);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
