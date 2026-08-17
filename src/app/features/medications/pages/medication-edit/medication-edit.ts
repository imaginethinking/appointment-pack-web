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
import { MedicationFormFields } from '../../components/medication-form-fields/medication-form-fields';
import { createMedicationForm, mapMedicationFormToRequest, resetMedicationForm } from '../../forms/medication-form';
import { MedicationResponse } from '../../models/medication-model';
import { MedicationApiService } from '../../services/medication-api-service';

type MedicationEditStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-medication-edit',
  imports: [ReactiveFormsModule, RouterLink, MedicationFormFields],
  templateUrl: './medication-edit.html',
})
export class MedicationEdit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly medicationApi = inject(MedicationApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly medication = signal<MedicationResponse | null>(null);
  protected readonly status = signal<MedicationEditStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly isSaving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'medication', 'edit'));
  protected readonly form = createMedicationForm(this.formBuilder);

  constructor() {
    effect(() => {
      const medication = this.medication();
      const selectedPatient = this.selectedPatient();

      if (medication !== null && (selectedPatient === null || medication.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/medications']);
      }
    });
  }

  ngOnInit(): void {
    const medicationId = this.route.snapshot.paramMap.get('medicationId');

    if (medicationId === null || medicationId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadMedication(medicationId);
  }

  protected save(): void {
    const medication = this.medication();

    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    if (medication === null || this.status() !== 'ready') {
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

    this.medicationApi.updateMedication(medication.id, mapMedicationFormToRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (updatedMedication) => void this.router.navigate(['/medications', updatedMedication.id]),
      error: (error: unknown) => this.handleSaveError(error, medication),
    });
  }

  protected retry(): void {
    const medicationId = this.route.snapshot.paramMap.get('medicationId');

    if (medicationId !== null) {
      this.loadMedication(medicationId);
    }
  }

  private loadMedication(medicationId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.medication.set(null);

    this.medicationApi.getMedication(medicationId).subscribe({
      next: (medication) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || medication.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This medication is not available for the selected patient.');
          return;
        }

        if (!this.canEdit()) {
          this.status.set('forbidden');
          return;
        }

        this.medication.set(medication);
        resetMedicationForm(this.form, medication);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the medication for editing.'));
  }

  private handleSaveError(error: unknown, medication: MedicationResponse): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(medication.patientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to update the medication.'));
  }

  private recoverPatientAccess(failedPatientRecordId: string | null): void {
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/medications']);
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
