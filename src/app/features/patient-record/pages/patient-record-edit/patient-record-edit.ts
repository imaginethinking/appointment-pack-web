import {Component, inject, OnInit, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';

import {applyServerFieldErrors} from '../../../../core/forms/server-field-errors';
import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {
  BLOOD_TYPES,
  BloodType,
  HEIGHT_UNITS,
  HeightUnit,
  PatientRecordResponse,
  WEIGHT_UNITS,
  WeightUnit
} from '../../models/patient-record-model';
import {PersonalPatientRecordState} from '../../services/personal-patient-record-state';

@Component({
  selector: 'app-patient-record-edit',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './patient-record-edit.html',
  styleUrl: './patient-record-edit.css'
})
export class PatientRecordEdit implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly patientRecordState = inject(PersonalPatientRecordState);
  private readonly router = inject(Router);

  protected readonly isLoading = this.patientRecordState.isLoading;

  protected readonly isSaving = this.patientRecordState.isSaving;

  protected readonly errorMessage = signal('');
  protected readonly recordMissing = signal(false);

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
    heightUnit: this.formBuilder.control<HeightUnit | null>(null),
    weight: this.formBuilder.control<number | null>(
      null,
      [
        Validators.min(0.01),
        Validators.max(9999.99)
      ]
    ),
    weightUnit: this.formBuilder.control<WeightUnit | null>(null),
    bloodType: this.formBuilder.control<BloodType | null>(null)
  });

  ngOnInit(): void {
    const patientRecord = this.patientRecordState.patientRecord();

    if (patientRecord !== null) {
      this.populateForm(patientRecord);
      return;
    }

    this.loadPatientRecord();
  }

  protected update(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.patientRecordState.updateCurrentPatientRecord({
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
        if (!applyServerFieldErrors(this.form, error)) {
          this.errorMessage.set(
            getHttpErrorMessage(
              error,
              'Unable to update your patient record.'
            )
          );
        }
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

  private loadPatientRecord(): void {
    this.errorMessage.set('');
    this.recordMissing.set(false);

    this.patientRecordState
      .loadCurrentPatientRecord()
      .subscribe({
        next: (patientRecord) => {
          if (patientRecord === null) {
            this.recordMissing.set(true);
            return;
          }

          this.populateForm(patientRecord);
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            getHttpErrorMessage(
              error,
              'Unable to load your patient record.'
            )
          );
        }
      });
  }

  private populateForm(patientRecord: PatientRecordResponse): void {
    this.form.reset({
      nhsNumber: patientRecord.nhsNumber ?? '',
      chiNumber: patientRecord.chiNumber ?? '',
      hcNumber: patientRecord.hcNumber ?? '',
      height: patientRecord.height,
      heightUnit: patientRecord.heightUnit,
      weight: patientRecord.weight,
      weightUnit: patientRecord.weightUnit,
      bloodType: patientRecord.bloodType
    });
  }

  private emptyToNull(value: string): string | null {
    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? null : trimmedValue;
  }
}
