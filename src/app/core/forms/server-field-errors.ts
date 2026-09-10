import {AbstractControl, FormArray, FormGroup} from '@angular/forms';

import {getHttpFieldErrors} from '../http/http-problem-detail';

/**
 * Adds returned field errors to the matching form controls and marks them as touched.
 */
export function applyServerFieldErrors(form: FormGroup, error: unknown): boolean {
  const fieldErrors = getHttpFieldErrors(error);
  let applied = false;

  for (const [fieldName, message] of Object.entries(fieldErrors)) {
    const control = form.get(normaliseControlPath(fieldName));

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

/**
 * Clears returned field errors from a control and any controls nested inside it.
 */
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

/**
 * Removes the returned field error while keeping any other validation errors on the control.
 */
export function clearServerFieldError(control: AbstractControl): void {
  const errors = control.errors;

  if (errors === null || errors['server'] === undefined) {
    return;
  }

  const remainingErrors = Object.fromEntries(Object.entries(errors).filter(([key]) => key !== 'server'));
  control.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
}

/**
 * Converts array field paths into the format used by Angular forms.
 */
function normaliseControlPath(fieldName: string): string {
  // [AI-GENERATED: ChatGPT, 2026-08-16]
  // Used to generate regular expression to match array field paths
  return fieldName.replace(/\[(\d+)]/g, '.$1');
}
