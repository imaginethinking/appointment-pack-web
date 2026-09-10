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
import {BloodTestFormFields} from '../../components/blood-test-form-fields/blood-test-form-fields';
import {createBloodTestForm, mapBloodTestFormToRequest, resetBloodTestForm} from '../../forms/blood-test-form';
import {BloodTestApiService} from '../../services/blood-test-api-service';

/**
 * Provides the form for adding a blood test and its results to the selected patient.
 */
@Component({
  selector: 'app-blood-test-create',
  imports: [ReactiveFormsModule, RouterLink, BloodTestFormFields],
  templateUrl: './blood-test-create.html',
})
export class BloodTestCreate {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly bloodTestApi = inject(BloodTestApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'blood-result', 'edit'));
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = createBloodTestForm(this.formBuilder);

  /**
   * Resets the form when the selected patient changes.
   */
  constructor() {
    effect(() => {
      this.selectedPatient()?.patientRecordId;
      resetBloodTestForm(this.form, this.formBuilder);
      this.errorMessage.set('');
    });
  }

  /**
   * Checks the form and saves the new blood test for the selected patient.
   */
  protected create(): void {
    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    const selectedPatient = this.selectedPatient();

    if (selectedPatient === null || !this.canEdit()) {
      this.errorMessage.set('Your current access does not allow new blood tests to be added.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    this.bloodTestApi.createBloodTest(selectedPatient.patientRecordId, mapBloodTestFormToRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (bloodTest) => void this.router.navigate(['/blood-results', bloodTest.id]),
      error: (error: unknown) => this.handleCreateError(error, selectedPatient.patientRecordId),
    });
  }

  /**
   * Handles validation and access errors returned while creating the blood test.
   */
  private handleCreateError(error: unknown, failedPatientRecordId: string): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      this.refreshPatientAccess(failedPatientRecordId);
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to create the blood test.'));
  }

  /**
   * Refreshes patient access and checks whether the blood test can still be added to the same patient.
   */
  private refreshPatientAccess(failedPatientRecordId: string): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/blood-results']);
          return;
        }

        this.errorMessage.set(this.canEdit()
          ? 'The blood test could not be created because the patient record is no longer available.'
          : 'Your current access does not allow new blood tests to be added.');
      },
      error: (refreshError: unknown) => this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.')),
    });
  }
}
