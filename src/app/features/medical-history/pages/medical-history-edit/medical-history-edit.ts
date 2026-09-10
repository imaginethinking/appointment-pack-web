import {Component, computed, effect, inject, OnInit, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';

import {applyServerFieldErrors, clearServerFieldErrors} from '../../../../core/forms/server-field-errors';
import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {getDocumentTypeLabel} from '../../../documents/models/document-model';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {MedicalHistoryFormFields} from '../../components/medical-history-form-fields/medical-history-form-fields';
import {
  createMedicalHistoryForm,
  mapMedicalHistoryFormToUpdateRequest,
  resetMedicalHistoryForm
} from '../../forms/medical-history-form';
import {getMedicalHistorySourceLabel, MedicalHistoryEntryResponse} from '../../models/medical-history-model';
import {MedicalHistoryApiService} from '../../services/medical-history-api-service';

type MedicalHistoryEditStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

/**
 * Loads a Medical History entry into the form so it can be reviewed and edited.
 */
@Component({
  selector: 'app-medical-history-edit',
  imports: [ReactiveFormsModule, RouterLink, MedicalHistoryFormFields],
  templateUrl: './medical-history-edit.html',
})
export class MedicalHistoryEdit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly medicalHistoryApi = inject(MedicalHistoryApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly entry = signal<MedicalHistoryEntryResponse | null>(null);
  protected readonly status = signal<MedicalHistoryEditStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly isSaving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'history', 'edit'));
  protected readonly form = createMedicalHistoryForm(this.formBuilder);
  protected readonly getMedicalHistorySourceLabel = getMedicalHistorySourceLabel;
  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;

  /**
   * Leaves the edit page if the loaded entry no longer belongs to the selected patient.
   */
  constructor() {
    effect(() => {
      const entry = this.entry();
      const selectedPatient = this.selectedPatient();

      if (entry !== null && (selectedPatient === null || entry.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/medical-history']);
      }
    });
  }

  /**
   * Finds the entry id in the route and loads the entry for editing.
   */
  ngOnInit(): void {
    const entryId = this.route.snapshot.paramMap.get('entryId');

    if (entryId === null || entryId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadEntry(entryId);
  }

  /**
   * Validates the form and saves the updated Medical History entry.
   */
  protected save(): void {
    const entry = this.entry();

    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    if (entry === null || this.status() !== 'ready') {
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

    this.medicalHistoryApi.updateMedicalHistoryEntry(entry.id, mapMedicalHistoryFormToUpdateRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (updatedEntry) => void this.router.navigate(['/medical-history', updatedEntry.id]),
      error: (error: unknown) => this.handleSaveError(error, entry),
    });
  }

  /**
   * Reloads the entry after a failed attempt.
   */
  protected retry(): void {
    const entryId = this.route.snapshot.paramMap.get('entryId');

    if (entryId !== null) {
      this.loadEntry(entryId);
    }
  }

  /**
   * Loads the entry and fills the edit form with its current information.
   */
  private loadEntry(entryId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.entry.set(null);

    this.medicalHistoryApi.getMedicalHistoryEntry(entryId).subscribe({
      next: (entry) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || entry.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This medical history entry is not available for the selected patient.');
          return;
        }

        if (!this.canEdit()) {
          this.status.set('forbidden');
          return;
        }

        this.entry.set(entry);
        resetMedicalHistoryForm(this.form, entry);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  /**
   * Updates the page when the entry cannot be loaded.
   */
  private handleLoadError(error: unknown, failedPatientRecordId: string | null): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(failedPatientRecordId, 'forbidden');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.recoverPatientAccess(failedPatientRecordId, 'not-found');
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the medical history entry.'));
  }

  /**
   * Applies field errors and handles problems that occur while saving the entry.
   */
  private handleSaveError(error: unknown, entry: MedicalHistoryEntryResponse): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(entry.patientRecordId, 'forbidden');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.recoverPatientAccess(entry.patientRecordId, 'not-found');
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to save the medical history entry.'));
  }

  /**
   * Refreshes patient access and returns to Medical History if the selected patient has changed.
   */
  private recoverPatientAccess(failedPatientRecordId: string | null, fallbackStatus: 'forbidden' | 'not-found'): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/medical-history']);
          return;
        }

        this.status.set(fallbackStatus);
      },
      error: (refreshError: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.'));
      },
    });
  }
}
