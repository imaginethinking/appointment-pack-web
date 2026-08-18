import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { AuthService } from './core/services/auth-service';
import { PageTelemetryService } from './core/services/page-telemetry-service';
import { PatientContextCoordinator } from './features/patient-context/services/patient-context-coordinator';


describe('App', () => {
  // This creates the root application with small mocks because this test only needs to check the skip link.
  function createApp() {
    const authenticated = signal(false);

    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            authenticated: authenticated.asReadonly(),
          },
        },
        {
          provide: PageTelemetryService,
          useValue: {
            start: vi.fn(),
          },
        },
        {
          provide: PatientContextCoordinator,
          useValue: {
            load: vi.fn(),
            reset: vi.fn(),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    return fixture;
  }

  // This protects the accessibility fix so the skip link stays on the current route and focuses main content.
  it('moves focus to the current page main content', () => {
    const fixture = createApp();
    const root = fixture.nativeElement as HTMLElement;
    const skipLink = root.querySelector('.skip-link') as HTMLAnchorElement;
    const mainContent = root.querySelector('#main-content') as HTMLElement;
    const focusSpy = vi.spyOn(mainContent, 'focus');

    skipLink.click();

    expect(focusSpy).toHaveBeenCalledOnce();
  });
});
