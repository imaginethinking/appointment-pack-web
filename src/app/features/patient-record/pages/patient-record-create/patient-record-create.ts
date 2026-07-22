import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';

import {applyServerFieldErrors} from '../../../../core/forms/server-field-errors';
import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {BLOOD_TYPES, BloodType, HEIGHT_UNITS, HeightUnit, WEIGHT_UNITS, WeightUnit} from '../../models/patient-record-model';
import {PersonalPatientRecordState} from '../../services/personal-patient-record-state';

@Component({
  selector: 'app-patient-record-create',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './patient-record-create.html',
  styleUrl: './patient-record-create.css'
})
export class PatientRecordCreate {
  private readonly formBuilder = inject(FormBuilder);
  private readonly patientRecordState = inject(PersonalPatientRecordState);
  private readonly router = inject(Router);

  protected readonly isSaving = this.patientRecordState.isSaving;

  protected readonly errorMessage = signal('');

  protected readonly bloodTypes = BLOOD_TYPES;
  protected readonly heightUnits = HEIGHT_UNITS;
  protected readonly weightUnits = WEIGHT_UNITS;

  protected readonly form = this.formBuilder.group({
    nhsNumber: this.formBuilder.nonNullable.control(
      '',
      Validators.maxLength(20)
    ),
    chiNumber: this.formBuilder.nonNullable.control(
      '',
      Validators.maxLength(20)
    ),
    hcNumber: this.formBuilder.nonNullable.control(
      '',
      Validators.maxLength(20)
    ),
    height: this.formBuilder.control<number | null>(
      null,
      [
        Validators.min(0.01),
        Validators.max(9999.99)
      ]
    ),
    heightUnit: this.formBuilder.control<HeightUnit | null>(
      null
    ),
    weight: this.formBuilder.control<number | null>(
      null,
      [
        Validators.min(0.01),
        Validators.max(9999.99)
      ]
    ),
    weightUnit: this.formBuilder.control<WeightUnit | null>(
      null
    ),
    bloodType: this.formBuilder.control<BloodType | null>(
      null
    )
  });

  protected create(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.patientRecordState.createPatientRecord({
      nhsNumber: this.emptyToNull(value.nhsNumber),
      chiNumber: this.emptyToNull(value.chiNumber),
      hcNumber: this.emptyToNull(value.hcNumber),
      height: value.height,
      heightUnit: value.heightUnit,
      weight: value.weight,
      weightUnit: value.weightUnit,
      bloodType: value.bloodType
    }).subscribe({
      next: () => {
        void this.router.navigate(['/patient']);
      },
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.form, error)) {
          return;
        }

        if (hasHttpStatus(error, 409)) {
          this.errorMessage.set(
            'A personal patient record already exists.'
          );
          return;
        }

        this.errorMessage.set(
          getHttpErrorMessage(
            error,
            'Unable to create your patient record.'
          )
        );
      }
    });
  }

  protected formatOption(value: string): string {
    return value
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, character =>
        character.toUpperCase()
      );
  }

  private emptyToNull(value: string): string | null {
    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? null : trimmedValue;
  }
}
