import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { applyServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import {
  BLOOD_TYPES,
  BloodType,
  HEIGHT_UNITS,
  HeightUnit,
  PatientRecordResponse,
  WEIGHT_UNITS,
  WeightUnit,
} from '../../models/patient-record-model';
import { PatientRecordApiService } from '../../services/patient-record-api-service';

@Component({
  selector: 'app-patient-record-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './patient-record-edit.html',
  styleUrl: './patient-record-edit.css',
})
export class PatientRecordEdit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly patientRecordApi = inject(PatientRecordApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly contextCoordinator = inject(PatientContextCoordinator);
  private readonly router = inject(Router);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;

  protected readonly isContextLoading = this.contextCoordinator.isLoading;

  protected readonly contextLoadFailed = this.contextCoordinator.loadFailed;

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly recordReady = signal(false);
  protected readonly noSelection = signal(false);
  protected readonly accessDenied = signal(false);
  protected readonly recordMissing = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly bloodTypes = BLOOD_TYPES;
  protected readonly heightUnits = HEIGHT_UNITS;
  protected readonly weightUnits = WEIGHT_UNITS;

  protected readonly form = this.formBuilder.group({
    nhsNumber: this.formBuilder.nonNullable.control('', Validators.maxLength(20)),
    chiNumber: this.formBuilder.nonNullable.control('', Validators.maxLength(20)),
    hcNumber: this.formBuilder.nonNullable.control('', Validators.maxLength(20)),
    height: this.formBuilder.control<number | null>(null, [
      Validators.min(0.01),
      Validators.max(9999.99),
    ]),
    heightUnit: this.formBuilder.control<HeightUnit | null>(null),
    weight: this.formBuilder.control<number | null>(null, [
      Validators.min(0.01),
      Validators.max(9999.99),
    ]),
    weightUnit: this.formBuilder.control<WeightUnit | null>(null),
    bloodType: this.formBuilder.control<BloodType | null>(null),
  });

  constructor() {
    effect((onCleanup) => {
      const contextLoading = this.isContextLoading();
      const contextLoadFailed = this.contextLoadFailed();
      const context = this.selectedPatient();

      this.recordReady.set(false);
      this.noSelection.set(false);
      this.accessDenied.set(false);
      this.recordMissing.set(false);
      this.errorMessage.set('');

      if (contextLoading) {
        return;
      }

      if (contextLoadFailed) {
        this.errorMessage.set('Unable to load your patient access.');
        return;
      }

      if (context === null) {
        this.noSelection.set(true);
        return;
      }

      if (!this.authorisation.can(context, 'patient-record', 'edit')) {
        this.accessDenied.set(true);
        return;
      }

      this.isLoading.set(true);

      const subscription = this.patientRecordApi
        .getPatientRecord(context.patientRecordId)
        .pipe(
          finalize(() => {
            this.isLoading.set(false);
          }),
        )
        .subscribe({
          next: (patientRecord) => {
            this.populateForm(patientRecord);
            this.recordReady.set(true);
          },
          error: (error: unknown) => {
            if (hasHttpStatus(error, 403)) {
              this.accessDenied.set(true);
              return;
            }

            if (hasHttpStatus(error, 404)) {
              this.recordMissing.set(true);
              return;
            }

            this.errorMessage.set(
              getHttpErrorMessage(error, 'Unable to load the selected patient record.'),
            );
          }
        });

      onCleanup(() => {
        subscription.unsubscribe();
      });
    });
  }

  protected update(): void {
    this.errorMessage.set('');

    const context = this.selectedPatient();

    if (context === null || !this.authorisation.can(context, 'patient-record', 'edit')) {
      this.accessDenied.set(true);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.isSaving.set(true);

    this.patientRecordApi
      .updatePatientRecord(context.patientRecordId, {
        nhsNumber: this.emptyToNull(value.nhsNumber),
        chiNumber: this.emptyToNull(value.chiNumber),
        hcNumber: this.emptyToNull(value.hcNumber),
        height: value.height,
        heightUnit: value.heightUnit,
        weight: value.weight,
        weightUnit: value.weightUnit,
        bloodType: value.bloodType,
      })
      .pipe(
        finalize(() => {
          this.isSaving.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/patient']);
        },
        error: (error: unknown) => {
          if (applyServerFieldErrors(this.form, error)) {
            return;
          }

          if (hasHttpStatus(error, 403)) {
            this.accessDenied.set(true);
            return;
          }

          if (hasHttpStatus(error, 404)) {
            this.recordMissing.set(true);
            return;
          }

          this.errorMessage.set(
            getHttpErrorMessage(error, 'Unable to update the selected patient record.'),
          );
        }
      });
  }

  protected selectedPatientName(): string {
    const context = this.selectedPatient();

    return context === null ? '' : getPatientContextName(context);
  }

  protected contextLabel(): string {
    return this.selectedPatient()?.contextType === 'SELF' ? 'Your record' : 'Carer access';
  }

  protected formatOption(value: string): string {
    return value
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
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
      bloodType: patientRecord.bloodType,
    });
  }

  private emptyToNull(value: string): string | null {
    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? null : trimmedValue;
  }
}
