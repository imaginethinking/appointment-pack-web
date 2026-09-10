import {AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';

import {pastOrPresentDateValidator} from '../../../core/forms/date-validators';
import {normaliseOptionalText} from '../../../shared/utils/formatting';
import {BloodTestRequest, BloodTestResponse, BloodTestResultResponse} from '../models/blood-test-model';

/**
 * Creates the form used to enter a blood test and its results.
 */
export function createBloodTestForm(formBuilder: FormBuilder) {
  return formBuilder.group({
    title: formBuilder.nonNullable.control('', Validators.maxLength(200)),
    testDate: formBuilder.nonNullable.control('', [Validators.required, pastOrPresentDateValidator]),
    provider: formBuilder.nonNullable.control('', Validators.maxLength(200)),
    notes: formBuilder.nonNullable.control('', Validators.maxLength(2000)),
    results: formBuilder.array([createBloodTestResultForm(formBuilder)], [Validators.required, Validators.maxLength(100)]),
  });
}

export type BloodTestForm = ReturnType<typeof createBloodTestForm>;
export type BloodTestResultForm = ReturnType<typeof createBloodTestResultForm>;

/**
 * Creates a result row using existing blood test data when it is available.
 */
export function createBloodTestResultForm(formBuilder: FormBuilder, result: BloodTestResultResponse | null = null) {
  return formBuilder.group({
    analyteName: formBuilder.nonNullable.control(result?.analyteName ?? '', [Validators.required, nonBlankValidator, Validators.maxLength(200)]),
    resultValue: formBuilder.nonNullable.control(result?.resultValue ?? '', [Validators.required, nonBlankValidator, Validators.maxLength(100)]),
    unit: formBuilder.nonNullable.control(result?.unit ?? '', Validators.maxLength(100)),
    referenceRange: formBuilder.nonNullable.control(result?.referenceRange ?? '', Validators.maxLength(150)),
    flag: formBuilder.control(result?.flag ?? null),
  });
}

/**
 * Adds another result row while keeping the blood test within the maximum number of results.
 */
export function addBloodTestResult(form: BloodTestForm, formBuilder: FormBuilder): void {
  if (form.controls.results.length >= 100) {
    return;
  }

  form.controls.results.push(createBloodTestResultForm(formBuilder));
}

/**
 * Removes a result row while keeping at least one row in the form.
 */
export function removeBloodTestResult(form: BloodTestForm, index: number): void {
  if (form.controls.results.length <= 1) {
    return;
  }

  form.controls.results.removeAt(index);
  form.controls.results.markAsTouched();
}

/**
 * Converts the blood test form and its result rows into the request used when saving a blood test.
 */
export function mapBloodTestFormToRequest(form: BloodTestForm): BloodTestRequest {
  const value = form.getRawValue();

  return {
    title: normaliseOptionalText(value.title),
    testDate: value.testDate,
    provider: normaliseOptionalText(value.provider),
    notes: normaliseOptionalText(value.notes),
    results: value.results.map((result) => ({
      analyteName: result.analyteName.trim(),
      resultValue: result.resultValue.trim(),
      unit: normaliseOptionalText(result.unit),
      referenceRange: normaliseOptionalText(result.referenceRange),
      flag: result.flag,
    })),
  };
}

/**
 * Resets the blood test form and rebuilds its result rows from the supplied blood test.
 */
export function resetBloodTestForm(form: BloodTestForm, formBuilder: FormBuilder, bloodTest: BloodTestResponse | null = null): void {
  form.controls.results.clear();

  const results = bloodTest?.results.length ? bloodTest.results : [null];

  for (const result of results) {
    form.controls.results.push(createBloodTestResultForm(formBuilder, result));
  }

  form.controls.title.setValue(bloodTest?.title ?? '');
  form.controls.testDate.setValue(bloodTest?.testDate ?? '');
  form.controls.provider.setValue(bloodTest?.provider ?? '');
  form.controls.notes.setValue(bloodTest?.notes ?? '');
  form.markAsPristine();
  form.markAsUntouched();
}

/**
 * Rejects text that contains only spaces.
 */
const nonBlankValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
};
