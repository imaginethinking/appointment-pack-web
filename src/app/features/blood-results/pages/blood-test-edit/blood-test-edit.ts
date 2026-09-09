import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { BloodTestFormFields } from '../../components/blood-test-form-fields/blood-test-form-fields';
import { createBloodTestForm, mapBloodTestFormToRequest, resetBloodTestForm } from '../../forms/blood-test-form';
import { BloodTestResponse } from '../../models/blood-test-model';
import { BloodTestApiService } from '../../services/blood-test-api-service';

type BloodTestEditStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

/**
 * Loads an existing blood test into the shared form so its details and results can be edited.
 */
@Component({
  selector: 'app-blood-test-edit',
  imports: [ReactiveFormsModule, RouterLink, BloodTestFormFields],
  templateUrl: './blood-test-edit.html',
})
export class BloodTestEdit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly bloodTestApi = inject(BloodTestApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly bloodTest = signal<BloodTestResponse | null>(null);
  protected readonly status = signal<BloodTestEditStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly isSaving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'blood-result', 'edit'));
  protected readonly form = createBloodTestForm(this.formBuilder);

  /**
   * Returns to the results list if the blood test no longer matches the selected patient.
   */
  constructor() {
    effect(() => {
      const bloodTest = this.bloodTest();
      const selectedPatient = this.selectedPatient();

      if (bloodTest !== null && (selectedPatient === null || bloodTest.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/blood-results']);
      }
    });
  }

  /**
   * Loads the blood test identified by the current route.
   */
  ngOnInit(): void {
    const bloodTestId = this.route.snapshot.paramMap.get('bloodTestId');

    if (bloodTestId === null || bloodTestId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadBloodTest(bloodTestId);
  }

  /**
   * Checks the form and saves the changes made to the blood test.
   */
  protected save(): void {
    const bloodTest = this.bloodTest();
    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    if (bloodTest === null || this.status() !== 'ready') {
      return;
    }

    if (!this.canEdit()) {
      this.status.set('forbidden');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    this.bloodTestApi.updateBloodTest(bloodTest.id, mapBloodTestFormToRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (updatedBloodTest) => void this.router.navigate(['/blood-results', updatedBloodTest.id]),
      error: (error: unknown) => this.handleSaveError(error, bloodTest),
    });
  }

  /**
   * Reloads the blood test after a failed attempt.
   */
  protected retry(): void {
    const bloodTestId = this.route.snapshot.paramMap.get('bloodTestId');

    if (bloodTestId !== null) {
      this.loadBloodTest(bloodTestId);
    }
  }

  /**
   * Loads the blood test and fills the form when it is available for the selected patient.
   */
  private loadBloodTest(bloodTestId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.bloodTest.set(null);

    this.bloodTestApi.getBloodTest(bloodTestId).subscribe({
      next: (bloodTest) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || bloodTest.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This blood test is not available for the selected patient.');
          return;
        }

        if (!this.canEdit()) {
          this.status.set('forbidden');
          return;
        }

        this.bloodTest.set(bloodTest);
        resetBloodTestForm(this.form, this.formBuilder, bloodTest);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  /**
   * Updates the page when the blood test cannot be loaded.
   */
  private handleLoadError(error: unknown, failedPatientRecordId: string | null): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(failedPatientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the blood test for editing.'));
  }

  /**
   * Applies any field errors and handles failures while saving the blood test.
   */
  private handleSaveError(error: unknown, bloodTest: BloodTestResponse): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(bloodTest.patientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to update the blood test.'));
  }

  /**
   * Refreshes patient access and leaves the edit page when the selected patient has changed.
   */
  private recoverPatientAccess(failedPatientRecordId: string | null): void {
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/blood-results']);
          return;
        }

        this.status.set('forbidden');
      },
      error: (refreshError: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.'));
      },
    });
  }
}
