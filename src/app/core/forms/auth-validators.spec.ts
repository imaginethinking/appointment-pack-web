// These tests cover the shared account validators rather than Angular's built-in required/email rules.
// The system time is fixed where dates are involved so results do not change depending on when tests run.

import { FormControl, FormGroup } from '@angular/forms';

import { matchingControlsValidator, pastDateValidator, strongPasswordValidator } from './auth-validators';

describe('authentication validators', () => {
  // Restores real timers after any test that uses a fixed date.
  afterEach(() => {
    vi.useRealTimers();
  });

  // Checks a password that meets the required length and character rules.
  it('accepts a strong password', () => {
    const control = new FormControl('Appointment1!');

    expect(strongPasswordValidator(control)).toBeNull();
  });

  // Checks the main weak-password cases.
  it.each([
    'Short1!',
    'appointment1!',
    'APPOINTMENT1!',
    'Appointment!',
    'Appointment1',
  ])('rejects a password that does not meet the strong-password policy: %s', (password) => {
    const control = new FormControl(password);

    expect(strongPasswordValidator(control)).toEqual({ strongPassword: true });
  });

  // Checks matching password fields pass the reusable confirmation validator.
  it('accepts matching password controls', () => {
    const form = new FormGroup({
      password: new FormControl('Appointment1!'),
      confirmPassword: new FormControl('Appointment1!'),
    }, { validators: matchingControlsValidator('password', 'confirmPassword') });

    expect(form.errors).toBeNull();
  });

  // Checks mismatched password fields receive the group level mismatch error used by account forms.
  it('rejects different password controls', () => {
    const form = new FormGroup({
      password: new FormControl('Appointment1!'),
      confirmPassword: new FormControl('Different1!'),
    }, { validators: matchingControlsValidator('password', 'confirmPassword') });

    expect(form.errors).toEqual({ mismatch: true });
  });

  // Checks date of birth must be strictly before today, not today or a future date.
  it('only accepts a valid date before today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 12, 0, 0));

    expect(pastDateValidator(new FormControl('2026-08-17'))).toBeNull();
    expect(pastDateValidator(new FormControl('2026-08-18'))).toEqual({ pastDate: true });
    expect(pastDateValidator(new FormControl('2026-08-19'))).toEqual({ pastDate: true });
    expect(pastDateValidator(new FormControl('2026-02-30'))).toEqual({ pastDate: true });
  });
});
