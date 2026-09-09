import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { normaliseOptionalText } from '../../../shared/utils/formatting';
import { MedicationRequest, MedicationResponse } from '../models/medication-model';

/**
 * Creates the form used to enter medication details.
 */
export function createMedicationForm(formBuilder: FormBuilder) {
  return formBuilder.group({
    name: formBuilder.nonNullable.control('', [Validators.required, nonBlankValidator, Validators.maxLength(200)]),
    dose: formBuilder.nonNullable.control('', Validators.maxLength(100)),
    form: formBuilder.nonNullable.control('', Validators.maxLength(100)),
    instructions: formBuilder.nonNullable.control('', Validators.maxLength(500)),
    startDate: formBuilder.nonNullable.control(''),
    endDate: formBuilder.nonNullable.control(''),
    notes: formBuilder.nonNullable.control('', Validators.maxLength(2000)),
  }, {
    validators: medicationDateRangeValidator,
  });
}

export type MedicationForm = ReturnType<typeof createMedicationForm>;

/**
 * Converts the medication form values into the request used when saving a medication.
 */
export function mapMedicationFormToRequest(form: MedicationForm): MedicationRequest {
  const value = form.getRawValue();

  return {
    name: value.name.trim(),
    dose: normaliseOptionalText(value.dose),
    form: normaliseOptionalText(value.form),
    instructions: normaliseOptionalText(value.instructions),
    startDate: normaliseOptionalText(value.startDate),
    endDate: normaliseOptionalText(value.endDate),
    notes: normaliseOptionalText(value.notes),
  };
}

/**
 * Resets the medication form using an existing medication when one is provided.
 */
export function resetMedicationForm(form: MedicationForm, medication: MedicationResponse | null = null): void {
  form.reset({
    name: medication?.name ?? '',
    dose: medication?.dose ?? '',
    form: medication?.form ?? '',
    instructions: medication?.instructions ?? '',
    startDate: medication?.startDate ?? '',
    endDate: medication?.endDate ?? '',
    notes: medication?.notes ?? '',
  });
}

/**
 * Rejects text that contains only spaces.
 */
const nonBlankValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
};

/**
 * Checks that the medication end date is not earlier than the start date.
 */
const medicationDateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const startDate = control.get('startDate')?.value;
  const endDate = control.get('endDate')?.value;

  if (typeof startDate !== 'string' || startDate.length === 0 || typeof endDate !== 'string' || endDate.length === 0) {
    return null;
  }

  return endDate >= startDate ? null : { endDateBeforeStart: true };
};
