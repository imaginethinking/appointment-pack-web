// Field validation errors can target normal controls or nested FormArray rows.
// These tests cover the shared helpers used to apply and clear those errors.

import { HttpErrorResponse } from '@angular/common/http';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

import { applyServerFieldErrors, clearServerFieldError, clearServerFieldErrors } from './server-field-errors';

describe('server field error helpers', () => {
  // Checks a normal field error is applied to the matching control and marked as touched.
  it('applies a server field error to a matching form control', () => {
    const form = new FormGroup({ name: new FormControl('Example') });
    const error = createValidationError({ name: 'Name is not valid' });

    const applied = applyServerFieldErrors(form, error);

    expect(applied).toBe(true);
    expect(form.controls.name.errors?.['server']).toBe('Name is not valid');
    expect(form.controls.name.touched).toBe(true);
  });

  // Checks paths such as results[0].analyteName reach the correct FormArray row.
  it('maps nested array field paths to Angular FormArray controls', () => {
    const form = new FormGroup({
      results: new FormArray([
        new FormGroup({ analyteName: new FormControl('Haemoglobin') }),
      ]),
    });
    const error = createValidationError({ 'results[0].analyteName': 'Analyte is duplicated' });

    const applied = applyServerFieldErrors(form, error);
    const analyteControl = form.get('results.0.analyteName');

    expect(applied).toBe(true);
    expect(analyteControl?.errors?.['server']).toBe('Analyte is duplicated');
  });

  // Checks removing a server error does not accidentally remove an existing client-side validation error.
  it('clears only the server error from a control', () => {
    const control = new FormControl('', Validators.required);
    control.setErrors({ required: true, server: 'Required by server' });

    clearServerFieldError(control);

    expect(control.errors).toEqual({ required: true });
  });

  // Checks recursive clearing removes server errors from nested controls as well as the root form.
  it('clears server errors recursively across a form', () => {
    const form = new FormGroup({
      title: new FormControl('Title'),
      results: new FormArray([
        new FormGroup({ value: new FormControl('10') }),
      ]),
    });
    form.controls.title.setErrors({ server: 'Title error' });
    form.get('results.0.value')?.setErrors({ server: 'Value error' });

    clearServerFieldErrors(form);

    expect(form.controls.title.errors).toBeNull();
    expect(form.get('results.0.value')?.errors).toBeNull();
  });
});

// Creates an HTTP error response containing field validation errors.
function createValidationError(fieldErrors: Record<string, string>): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 400,
    error: {
      title: 'Validation failed',
      detail: 'Request validation failed',
      fieldErrors,
    },
  });
}
