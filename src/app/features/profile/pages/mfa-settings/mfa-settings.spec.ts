// This is intentionally a small component test. It checks that the page asks the backend for MFA status
// instead of assuming the browser already knows whether MFA is enabled.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth-service';
import { MfaSettings } from './mfa-settings';

describe('MfaSettings', () => {
  let fixture: ComponentFixture<MfaSettings>;
  let authService: {
    getAccountSecurity: ReturnType<typeof vi.fn>;
  };

  // Builds the standalone MFA settings page with a mocked AuthService before each test.
  beforeEach(async () => {
    // The real AuthService is replaced with one predictable response for this test.
    authService = {
      getAccountSecurity: vi.fn().mockReturnValue(of({ mfaEnabled: true })),
    };

    // MfaSettings is a standalone component, so it is imported directly into the test module.
    await TestBed.configureTestingModule({
      imports: [MfaSettings],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MfaSettings);
  });

  // Resets the Angular test module after the component test finishes.
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  // Checks that the page loads MFA status from AuthService and renders the enabled state.
  it('loads authoritative MFA status from the backend when the page initializes', () => {
    // detectChanges() runs the component's normal initialisation and updates the rendered template.
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;

    expect(authService.getAccountSecurity).toHaveBeenCalledTimes(1);
    expect(text).toContain('Enabled');
    expect(text).toContain('Disable MFA');
  });
});
