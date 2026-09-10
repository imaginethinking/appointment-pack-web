import {Component, computed, effect, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';

import {applyServerFieldErrors, clearServerFieldErrors} from '../../../../core/forms/server-field-errors';
import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {getPatientContextName} from '../../../patient-context/models/selected-patient-context';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {MedicalHistoryFormFields} from '../../components/medical-history-form-fields/medical-history-form-fields';
import {
  createMedicalHistoryForm,
  mapMedicalHistoryFormToCreateRequest,
  resetMedicalHistoryForm
} from '../../forms/medical-history-form';
import {MedicalHistoryApiService} from '../../services/medical-history-api-service';

/**
 * Provides the form for adding a new Medical History entry to the selected patient.
 */
@Component({
  selector: 'app-medical-history-create',
  imports: [ReactiveFormsModule, RouterLink, MedicalHistoryFormFields],
  templateUrl: './medical-history-create.html',
})
export class MedicalHistoryCreate {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly medicalHistoryApi = inject(MedicalHistoryApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'history', 'edit'));
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = createMedicalHistoryForm(this.formBuilder);

  /**
   * Clears the form when the user switches to another patient.
   */
  constructor() {
    effect(() => {
      this.selectedPatient()?.patientRecordId;
      resetMedicalHistoryForm(this.form);
      this.errorMessage.set('');
    });
  }

  /**
   * Validates the entered information and adds it to the selected patient's Medical History.
   */
  protected create(): void {
    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    const selectedPatient = this.selectedPatient();

    if (selectedPatient === null || !this.canEdit()) {
      this.errorMessage.set('Your current access does not allow new medical history entries.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    this.medicalHistoryApi.createMedicalHistoryEntry(selectedPatient.patientRecordId, mapMedicalHistoryFormToCreateRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (entry) => void this.router.navigate(['/medical-history', entry.id]),
      error: (error: unknown) => this.handleCreateError(error, selectedPatient.patientRecordId),
    });
  }

  /**
   * Applies field errors and handles problems that occur while adding the entry.
   */
  private handleCreateError(error: unknown, failedPatientRecordId: string): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      this.refreshPatientAccess(failedPatientRecordId);
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to add the medical history entry.'));
  }

  /**
   * Refreshes patient access and checks whether an entry can still be added for the same patient.
   */
  private refreshPatientAccess(failedPatientRecordId: string): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/medical-history']);
          return;
        }

        this.errorMessage.set(
          this.canEdit()
            ? 'The medical history entry could not be added because the patient record is no longer available.'
            : 'Your current access does not allow new medical history entries.',
        );
      },
      error: (refreshError: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.'));
      },
    });
  }
}
