// Page telemetry should record only broad application areas and should never affect navigation.
// These tests use a small fake Router event stream so no real navigation or HTTP request is needed.

import { NavigationEnd, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';

import { AnalyticsApiService } from './analytics-api-service';
import { AuthService } from './auth-service';
import { PageTelemetryService } from './page-telemetry-service';

describe('PageTelemetryService', () => {
  let routerEvents: Subject<NavigationEnd>;
  let authenticated: ReturnType<typeof vi.fn>;
  let analyticsApi: { recordPageView: ReturnType<typeof vi.fn> };
  let service: PageTelemetryService;

  // Creates the telemetry service with a controllable router stream and mocked authentication/API state.
  beforeEach(() => {
    routerEvents = new Subject<NavigationEnd>();
    authenticated = vi.fn().mockReturnValue(true);
    analyticsApi = {
      recordPageView: vi.fn().mockReturnValue(of(void 0)),
    };

    TestBed.configureTestingModule({
      providers: [
        PageTelemetryService,
        { provide: Router, useValue: { events: routerEvents.asObservable() } },
        { provide: AuthService, useValue: { authenticated } },
        { provide: AnalyticsApiService, useValue: analyticsApi },
      ],
    });

    service = TestBed.inject(PageTelemetryService);
  });

  // Closes the fake event stream and resets Angular testing after each telemetry test.
  afterEach(() => {
    routerEvents.complete();
    TestBed.resetTestingModule();
  });

  // Checks that calling start more than once does not create duplicate page-view submissions.
  it('starts telemetry only once', () => {
    service.start();
    service.start();

    navigateTo('/home');

    expect(analyticsApi.recordPageView).toHaveBeenCalledTimes(1);
    expect(analyticsApi.recordPageView).toHaveBeenCalledWith('DASHBOARD');
  });

  // Checks that the public landing page can be recorded without making the user sign in first.
  it('records landing telemetry while unauthenticated', () => {
    authenticated.mockReturnValue(false);
    service.start();

    navigateTo('/');

    expect(analyticsApi.recordPageView).toHaveBeenCalledWith('LANDING');
  });

  // Checks that protected application pages are not submitted when there is no authenticated session.
  it('does not record authenticated-only pages while signed out', () => {
    authenticated.mockReturnValue(false);
    service.start();

    navigateTo('/documents');

    expect(analyticsApi.recordPageView).not.toHaveBeenCalled();
  });

  // Checks several important routes, including detail routes, map to their broad telemetry category.
  it.each([
    ['/patient/edit', 'PATIENT_RECORD'],
    ['/documents/document-123/summary-review', 'DOCUMENTS'],
    ['/appointment-packs/create', 'APPOINTMENT_PACKS'],
    ['/activity-history', 'ACTIVITY_HISTORY'],
    ['/care-network/patients', 'CARER_NETWORK'],
  ] as const)('maps %s to %s without sending the route or resource ID', (url, expectedPage) => {
    service.start();

    navigateTo(`${url}?from=test#section`);

    expect(analyticsApi.recordPageView).toHaveBeenCalledTimes(1);
    expect(analyticsApi.recordPageView).toHaveBeenCalledWith(expectedPage);
    expect(JSON.stringify(analyticsApi.recordPageView.mock.calls)).not.toContain('document-123');
  });

  // Checks that admin/internal or unknown routes do not invent a telemetry enum that the backend does not support.
  it('ignores routes without a supported page mapping', () => {
    service.start();

    navigateTo('/admin/analytics');
    navigateTo('/access-denied');
    navigateTo('/not-found');

    expect(analyticsApi.recordPageView).not.toHaveBeenCalled();
  });

  // Checks that a telemetry API failure is swallowed rather than being allowed to break navigation handling.
  it('ignores telemetry submission failures', () => {
    analyticsApi.recordPageView.mockReturnValue(throwError(() => new Error('telemetry unavailable')));
    service.start();

    expect(() => navigateTo('/home')).not.toThrow();
    expect(analyticsApi.recordPageView).toHaveBeenCalledWith('DASHBOARD');
  });

  // Emits the same NavigationEnd event that Angular sends after a successful route change.
  function navigateTo(url: string): void {
    routerEvents.next(new NavigationEnd(1, url, url));
  }
});
