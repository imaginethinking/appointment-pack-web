import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { applyServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatEnumLabel } from '../../../../shared/utils/formatting';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { createPatientRecordForm, mapPatientRecordFormToRequest, resetPatientRecordForm } from '../../forms/patient-record-form';
import { BLOOD_TYPES, HEIGHT_UNITS, PatientRecordResponse, WEIGHT_UNITS } from '../../models/patient-record-model';
import { PatientRecordApiService } from '../../services/patient-record-api-service';

type PatientRecordEditStatus = 'loading' | 'ready' | 'no-selection' | 'forbidden' | 'not-found' | 'error';

/**
 * Loads and edits the patient record currently selected by the user.
 */
@Component({
  selector: 'app-patient-record-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './patient-record-edit.html',
})
export class PatientRecordEdit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly patientRecordApi = inject(PatientRecordApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly router = inject(Router);
  private readonly reloadVersion = signal(0);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly selectedPatientId = computed(() => this.selectedPatient()?.patientRecordId ?? null);
  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });
  protected readonly canEditSelectedPatient = computed(() => this.authorisation.can(this.selectedPatient(), 'patient-record', 'edit'));
  protected readonly status = signal<PatientRecordEditStatus>('loading');
  protected readonly patientRecord = signal<PatientRecordResponse | null>(null);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly bloodTypes = BLOOD_TYPES;
  protected readonly heightUnits = HEIGHT_UNITS;
  protected readonly weightUnits = WEIGHT_UNITS;
  protected readonly form = createPatientRecordForm(this.formBuilder);
  protected readonly formatOption = formatEnumLabel;

  /**
   * Reloads the form whenever the selected patient or its available access changes.
   */
  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const patientRecordId = this.selectedPatientId();
      const canEdit = this.canEditSelectedPatient();

      this.patientRecord.set(null);
      this.errorMessage.set('');

      if (patientRecordId === null) {
        this.status.set('no-selection');
        return;
      }

      if (!canEdit) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = this.patientRecordApi.getPatientRecord(patientRecordId).subscribe({
        next: (patientRecord) => {
          this.patientRecord.set(patientRecord);
          resetPatientRecordForm(this.form, patientRecord);
          this.status.set('ready');
        },
        error: (error) => this.handleLoadError(error, patientRecordId),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Validates and saves changes to the selected patient record.
   */
  protected save(): void {
    const patientRecord = this.patientRecord();
    const patientRecordId = this.selectedPatientId();
    this.errorMessage.set('');

    if (patientRecord === null || patientRecordId === null || this.status() !== 'ready') {
      return;
    }

    if (!this.canEditSelectedPatient()) {
      void this.router.navigate(['/access-denied']);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    this.patientRecordApi.updatePatientRecord(patientRecordId, mapPatientRecordFormToRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (updatedPatientRecord) => {
        this.patientRecord.set(updatedPatientRecord);
        void this.router.navigate(['/patient']);
      },
      error: (error) => {
        if (applyServerFieldErrors(this.form, error)) {
          return;
        }

        if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
          this.recoverAfterSaveFailure(error, patientRecordId);
          return;
        }

        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to update the patient record.'));
      },
    });
  }

  /**
   * Triggers another attempt to load the selected patient record.
   */
  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  /**
   * Handles a failed patient record load and refreshes patient access when needed.
   */
  private handleLoadError(error: unknown, failedPatientRecordId: string): void {
    this.patientRecord.set(null);

    if (!hasHttpStatus(error, 403) && !hasHttpStatus(error, 404)) {
      this.status.set('error');
      this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the patient record for editing.'));
      return;
    }

    this.recoverContext(error, failedPatientRecordId);
  }

  /**
   * Refreshes patient access after a save fails because the selected record may have changed.
   */
  private recoverAfterSaveFailure(error: unknown, failedPatientRecordId: string): void {
    this.status.set('loading');
    this.recoverContext(error, failedPatientRecordId);
  }

  /**
   * Refreshes patient access and updates the page for the patient that is still selected.
   */
  private recoverContext(error: unknown, failedPatientRecordId: string): void {
    const recordNotFound = hasHttpStatus(error, 404);
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || selectedPatient.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/patient']);
          return;
        }

        if (!this.authorisation.can(selectedPatient, 'patient-record', 'edit')) {
          void this.router.navigate(['/access-denied']);
          return;
        }

        this.status.set(recordNotFound ? 'not-found' : 'forbidden');
      },
      error: (refreshError) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh your patient access.'));
      },
    });
  }
}
