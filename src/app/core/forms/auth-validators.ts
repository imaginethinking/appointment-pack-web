import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// [AI-GENERATED: ChatGPT, 2026-08-15]
// Used to generate REGEX pattern for a strong password
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\r\n]+$/;

/**
 * Checks that a password meets the required length and character rules.
 */
export const strongPasswordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  if (value.length < 8 || value.length > 128 || !STRONG_PASSWORD_PATTERN.test(value)) {
    return { strongPassword: true };
  }

  return null;
};

/**
 * Creates a validator that checks whether two controls contain the same value.
 */
export function matchingControlsValidator(firstControlName: string, secondControlName: string, errorKey = 'mismatch'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const firstValue = control.get(firstControlName)?.value;
    const secondValue = control.get(secondControlName)?.value;

    if (!firstValue || !secondValue) {
      return null;
    }

    return firstValue === secondValue ? null : { [errorKey]: true };
  };
}

/**
 * Checks that a date is valid and earlier than today.
 */
export const pastDateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match === null) {
    return { pastDate: true };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { pastDate: true };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date < today ? null : { pastDate: true };
};
