import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

import { getHttpFieldErrors } from '../http/http-problem-detail';

export function applyServerFieldErrors(form: FormGroup, error: unknown): boolean {
  const fieldErrors = getHttpFieldErrors(error);
  let applied = false;

  for (const [fieldName, message] of Object.entries(fieldErrors)) {
    const control = form.get(fieldName);

    if (control === null) {
      continue;
    }

    control.setErrors({
      ...control.errors,
      server: message,
    });

    control.markAsTouched();
    applied = true;
  }

  return applied;
}

export function clearServerFieldErrors(control: AbstractControl): void {
  clearServerFieldError(control);

  if (control instanceof FormGroup) {
    for (const childControl of Object.values(control.controls)) {
      clearServerFieldErrors(childControl);
    }
  } else if (control instanceof FormArray) {
    for (const childControl of control.controls) {
      clearServerFieldErrors(childControl);
    }
  }
}

export function clearServerFieldError(control: AbstractControl): void {
  const errors = control.errors;

  if (errors === null || errors['server'] === undefined) {
    return;
  }

  const remainingErrors = Object.fromEntries(Object.entries(errors).filter(([key]) => key !== 'server'));
  control.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
}
