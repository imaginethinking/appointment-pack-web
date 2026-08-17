import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { MedicationFormFields } from '../../components/medication-form-fields/medication-form-fields';
import { createMedicationForm, mapMedicationFormToRequest, resetMedicationForm } from '../../forms/medication-form';
import { MedicationApiService } from '../../services/medication-api-service';

@Component({
  selector: 'app-medication-create',
  imports: [ReactiveFormsModule, RouterLink, MedicationFormFields],
  templateUrl: './medication-create.html',
})
export class MedicationCreate {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly medicationApi = inject(MedicationApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'medication', 'edit'));
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = createMedicationForm(this.formBuilder);

  constructor() {
    effect(() => {
      this.selectedPatient()?.patientRecordId;
      resetMedicationForm(this.form);
      this.errorMessage.set('');
    });
  }

  protected create(): void {
    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    const selectedPatient = this.selectedPatient();

    if (selectedPatient === null || !this.canEdit()) {
      this.errorMessage.set('Your current access does not allow new medications to be added.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    this.medicationApi.createMedication(selectedPatient.patientRecordId, mapMedicationFormToRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (medication) => void this.router.navigate(['/medications', medication.id]),
      error: (error: unknown) => this.handleCreateError(error, selectedPatient.patientRecordId),
    });
  }

  private handleCreateError(error: unknown, failedPatientRecordId: string): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      this.refreshPatientAccess(failedPatientRecordId);
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to create the medication.'));
  }

  private refreshPatientAccess(failedPatientRecordId: string): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/medications']);
          return;
        }

        this.errorMessage.set(
          this.canEdit()
            ? 'The medication could not be created because the patient record is no longer available.'
            : 'Your current access does not allow new medications to be added.',
        );
      },
      error: (refreshError: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.'));
      },
    });
  }
}
