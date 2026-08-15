import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { normaliseOptionalText } from '../../../shared/utils/formatting';
import { BloodType, HeightUnit, PatientRecordRequest, PatientRecordResponse, WeightUnit } from '../models/patient-record-model';

export function createPatientRecordForm(formBuilder: FormBuilder) {
  return formBuilder.group({
    nhsNumber: formBuilder.nonNullable.control('', Validators.maxLength(10)),
    chiNumber: formBuilder.nonNullable.control('', Validators.maxLength(10)),
    hcNumber: formBuilder.nonNullable.control('', Validators.maxLength(10)),
    height: formBuilder.control<number | null>(null, [Validators.min(0.01), Validators.max(9999.99), decimalPlacesValidator(2)]),
    heightUnit: formBuilder.control<HeightUnit | null>(null),
    weight: formBuilder.control<number | null>(null, [Validators.min(0.01), Validators.max(9999.99), decimalPlacesValidator(2)]),
    weightUnit: formBuilder.control<WeightUnit | null>(null),
    bloodType: formBuilder.control<BloodType | null>(null),
  }, {
    validators: [
      measurementPairValidator('height', 'heightUnit', 'heightPair'),
      measurementPairValidator('weight', 'weightUnit', 'weightPair'),
    ],
  });
}

export type PatientRecordForm = ReturnType<typeof createPatientRecordForm>;

export function mapPatientRecordFormToRequest(form: PatientRecordForm): PatientRecordRequest {
  const value = form.getRawValue();

  return {
    nhsNumber: normaliseOptionalText(value.nhsNumber),
    chiNumber: normaliseOptionalText(value.chiNumber),
    hcNumber: normaliseOptionalText(value.hcNumber),
    height: value.height,
    heightUnit: value.heightUnit,
    weight: value.weight,
    weightUnit: value.weightUnit,
    bloodType: value.bloodType,
  };
}

export function resetPatientRecordForm(form: PatientRecordForm, patientRecord: PatientRecordResponse): void {
  form.reset({
    nhsNumber: patientRecord.nhsNumber ?? '',
    chiNumber: patientRecord.chiNumber ?? '',
    hcNumber: patientRecord.hcNumber ?? '',
    height: patientRecord.height,
    heightUnit: patientRecord.heightUnit,
    weight: patientRecord.weight,
    weightUnit: patientRecord.weightUnit,
    bloodType: patientRecord.bloodType,
  });
}

function measurementPairValidator(valueControlName: string, unitControlName: string, errorKey: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.get(valueControlName)?.value;
    const unit = control.get(unitControlName)?.value;
    const hasValue = value !== null && value !== undefined && value !== '';
    const hasUnit = unit !== null && unit !== undefined && unit !== '';

    return hasValue === hasUnit ? null : { [errorKey]: true };
  };
}

function decimalPlacesValidator(maximumDecimalPlaces: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const text = String(value);
    const decimalPlaces = text.includes('.') ? text.split('.')[1].length : 0;

    return decimalPlaces <= maximumDecimalPlaces ? null : {
      decimalPlaces: {
        maximum: maximumDecimalPlaces,
        actual: decimalPlaces,
      },
    };
  };
}
