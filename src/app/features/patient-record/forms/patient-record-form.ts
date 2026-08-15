import {FormBuilder, Validators} from '@angular/forms';

import {normaliseOptionalText} from '../../../shared/utils/formatting';
import {
  BloodType,
  HeightUnit,
  PatientRecordRequest,
  PatientRecordResponse,
  WeightUnit
} from '../models/patient-record-model';

export function createPatientRecordForm(formBuilder: FormBuilder) {
  return formBuilder.group({
    nhsNumber: formBuilder.nonNullable.control('', Validators.maxLength(20)),
    chiNumber: formBuilder.nonNullable.control('', Validators.maxLength(20)),
    hcNumber: formBuilder.nonNullable.control('', Validators.maxLength(20)),
    height: formBuilder.control<number | null>(null, [Validators.min(0.01), Validators.max(9999.99)]),
    heightUnit: formBuilder.control<HeightUnit | null>(null),
    weight: formBuilder.control<number | null>(null, [Validators.min(0.01), Validators.max(9999.99)]),
    weightUnit: formBuilder.control<WeightUnit | null>(null),
    bloodType: formBuilder.control<BloodType | null>(null),
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
