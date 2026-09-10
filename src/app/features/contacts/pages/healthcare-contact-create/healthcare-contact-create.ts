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
import {
  HealthcareContactFormFields
} from '../../components/healthcare-contact-form-fields/healthcare-contact-form-fields';
import {
  createHealthcareContactForm,
  mapHealthcareContactFormToRequest,
  resetHealthcareContactForm
} from '../../forms/healthcare-contact-form';
import {HealthcareContactApiService} from '../../services/healthcare-contact-api-service';

/**
 * Creates a healthcare contact for the selected patient.
 */
@Component({
  selector: 'app-healthcare-contact-create',
  imports: [ReactiveFormsModule, RouterLink, HealthcareContactFormFields],
  templateUrl: './healthcare-contact-create.html',
})
export class HealthcareContactCreate {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly healthcareContactApi = inject(HealthcareContactApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'contact', 'edit'));
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = createHealthcareContactForm(this.formBuilder);

  /**
   * Clears the form when the selected patient changes.
   */
  constructor() {
    effect(() => {
      this.selectedPatient()?.patientRecordId;
      resetHealthcareContactForm(this.form);
      this.errorMessage.set('');
    });
  }

  /**
   * Validates the form and creates a healthcare contact for the selected patient.
   */
  protected create(): void {
    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    const selectedPatient = this.selectedPatient();

    if (selectedPatient === null || !this.canEdit()) {
      this.errorMessage.set('Your current access does not allow new healthcare contacts to be added.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    this.healthcareContactApi.createHealthcareContact(selectedPatient.patientRecordId, mapHealthcareContactFormToRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (contact) => void this.router.navigate(['/contacts/healthcare', contact.id]),
      error: (error: unknown) => this.handleCreateError(error, selectedPatient.patientRecordId),
    });
  }

  /**
   * Applies form errors and refreshes patient access when the contact cannot be created.
   */
  private handleCreateError(error: unknown, failedPatientRecordId: string): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      this.refreshPatientAccess(failedPatientRecordId);
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to create the healthcare contact.'));
  }

  /**
   * Refreshes patient access and checks whether the same patient can still be edited.
   */
  private refreshPatientAccess(failedPatientRecordId: string): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/contacts']);
          return;
        }

        this.errorMessage.set(this.canEdit()
          ? 'The healthcare contact could not be created because the patient record is no longer available.'
          : 'Your current access does not allow new contacts to be added.');
      },
      error: (refreshError: unknown) => this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.')),
    });
  }
}
