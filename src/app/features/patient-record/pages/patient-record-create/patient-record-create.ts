import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { applyServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatEnumLabel } from '../../../../shared/utils/formatting';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { createPatientRecordForm, mapPatientRecordFormToRequest } from '../../forms/patient-record-form';
import { BLOOD_TYPES, HEIGHT_UNITS, WEIGHT_UNITS } from '../../models/patient-record-model';
import { PersonalPatientRecordState } from '../../services/personal-patient-record-state';

@Component({
  selector: 'app-patient-record-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './patient-record-create.html',
})
export class PatientRecordCreate {
  private readonly formBuilder = inject(FormBuilder);
  private readonly patientRecordState = inject(PersonalPatientRecordState);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly router = inject(Router);

  protected readonly isSaving = this.patientRecordState.isSaving;
  protected readonly errorMessage = signal('');
  protected readonly bloodTypes = BLOOD_TYPES;
  protected readonly heightUnits = HEIGHT_UNITS;
  protected readonly weightUnits = WEIGHT_UNITS;
  protected readonly form = createPatientRecordForm(this.formBuilder);
  protected readonly formatOption = formatEnumLabel;

  protected create(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.patientRecordState.createPatientRecord(mapPatientRecordFormToRequest(this.form)).subscribe({
      next: () => {
        this.selectedPatientState.revalidateSelection();
        void this.router.navigate(['/patient']);
      },
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.form, error)) {
          return;
        }

        if (hasHttpStatus(error, 409)) {
          this.errorMessage.set('A personal patient record already exists.');
          return;
        }

        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to create your patient record.'));
      },
    });
  }
}
