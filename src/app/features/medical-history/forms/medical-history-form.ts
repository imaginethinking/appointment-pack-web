import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { pastOrPresentDateValidator } from '../../../core/forms/date-validators';
import { CreateMedicalHistoryEntryRequest, MedicalHistoryEntryResponse, UpdateMedicalHistoryEntryRequest } from '../models/medical-history-model';

export function createMedicalHistoryForm(formBuilder: FormBuilder) {
  return formBuilder.group({
    title: formBuilder.nonNullable.control('', [Validators.required, nonBlankValidator, Validators.maxLength(200)]),
    summary: formBuilder.nonNullable.control('', [Validators.required, nonBlankValidator, Validators.maxLength(10000)]),
    entryDate: formBuilder.nonNullable.control('', [Validators.required, pastOrPresentDateValidator]),
  });
}

export type MedicalHistoryForm = ReturnType<typeof createMedicalHistoryForm>;

export function mapMedicalHistoryFormToCreateRequest(form: MedicalHistoryForm): CreateMedicalHistoryEntryRequest {
  return mapMedicalHistoryFormToRequest(form);
}

export function mapMedicalHistoryFormToUpdateRequest(form: MedicalHistoryForm): UpdateMedicalHistoryEntryRequest {
  return mapMedicalHistoryFormToRequest(form);
}

export function resetMedicalHistoryForm(form: MedicalHistoryForm, entry: MedicalHistoryEntryResponse | null = null): void {
  form.reset({
    title: entry?.title ?? '',
    summary: entry?.summary ?? '',
    entryDate: entry?.entryDate ?? '',
  });
}

function mapMedicalHistoryFormToRequest(form: MedicalHistoryForm): CreateMedicalHistoryEntryRequest {
  const value = form.getRawValue();

  return {
    title: value.title.trim(),
    summary: value.summary.trim(),
    entryDate: value.entryDate,
  };
}

const nonBlankValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
};
