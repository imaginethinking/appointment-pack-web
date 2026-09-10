import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {describe, expect, it, vi} from 'vitest';

import {AuthService} from '../../../core/services/auth-service';
import {PatientContextAuthorisation} from '../../../features/patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../features/patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../features/patient-context/services/selected-patient-state';
import {Navbar} from './navbar';

describe('Navbar', () => {
  // This creates the navbar with small state mocks so the test can focus only on menu behaviour.
  function createNavbar() {
    const authenticated = signal(true);
    const isAdmin = signal(false);
    const selectedPatient = signal(null);
    const contexts = signal([]);
    const selectedPatientRecordId = signal<string | null>(null);
    const isLoading = signal(false);
    const loadFailed = signal(false);

    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            authenticated: authenticated.asReadonly(),
            isAdmin: isAdmin.asReadonly(),
            logout: vi.fn(),
          },
        },
        {
          provide: SelectedPatientState,
          useValue: {
            selectedPatient: selectedPatient.asReadonly(),
            contexts: contexts.asReadonly(),
            selectedPatientRecordId: selectedPatientRecordId.asReadonly(),
            selectPatient: vi.fn(),
          },
        },
        {
          provide: PatientContextAuthorisation,
          useValue: {
            has: vi.fn(() => false),
          },
        },
        {
          provide: PatientContextCoordinator,
          useValue: {
            isLoading: isLoading.asReadonly(),
            loadFailed: loadFailed.asReadonly(),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(Navbar);
    fixture.detectChanges();

    return fixture;
  }

  // This checks that keyboard users can dismiss an open profile menu with Escape.
  it('closes the profile menu when Escape is pressed', () => {
    const fixture = createNavbar();

    const profileButton = fixture.nativeElement.querySelector(
      '[aria-controls="profile-navigation"]',
    ) as HTMLButtonElement;

    profileButton.click();
    fixture.detectChanges();

    expect(profileButton.getAttribute('aria-expanded')).toBe('true');

    // The Escape key starts from the navbar button and bubbles up to the navbar element.
    profileButton.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }),
    );

    fixture.detectChanges();

    expect(profileButton.getAttribute('aria-expanded')).toBe('false');
  });
});
