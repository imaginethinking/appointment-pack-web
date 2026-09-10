import {Component, computed, effect, inject, OnInit, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';

import {applyServerFieldErrors, clearServerFieldErrors} from '../../../../core/forms/server-field-errors';
import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {EmergencyContactFormFields} from '../../components/emergency-contact-form-fields/emergency-contact-form-fields';
import {
  createEmergencyContactForm,
  mapEmergencyContactFormToRequest,
  resetEmergencyContactForm
} from '../../forms/emergency-contact-form';
import {EmergencyContactResponse} from '../../models/emergency-contact-model';
import {EmergencyContactApiService} from '../../services/emergency-contact-api-service';

type EmergencyContactEditStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

/**
 * Loads and edits an emergency contact for the selected patient.
 */
@Component({
  selector: 'app-emergency-contact-edit',
  imports: [ReactiveFormsModule, RouterLink, EmergencyContactFormFields],
  templateUrl: './emergency-contact-edit.html',
})
export class EmergencyContactEdit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly emergencyContactApi = inject(EmergencyContactApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly contact = signal<EmergencyContactResponse | null>(null);
  protected readonly status = signal<EmergencyContactEditStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly isSaving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'contact', 'edit'));
  protected readonly form = createEmergencyContactForm(this.formBuilder);

  /**
   * Returns to the contacts page if the loaded contact no longer belongs to the selected patient.
   */
  constructor() {
    effect(() => {
      const contact = this.contact();
      const selectedPatient = this.selectedPatient();

      if (contact !== null && (selectedPatient === null || contact.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/contacts']);
      }
    });
  }

  /**
   * Loads the emergency contact from the id in the current route.
   */
  ngOnInit(): void {
    const contactId = this.route.snapshot.paramMap.get('contactId');

    if (contactId === null || contactId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadContact(contactId);
  }

  /**
   * Validates the form and saves changes to the emergency contact.
   */
  protected save(): void {
    const contact = this.contact();
    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    if (contact === null || this.status() !== 'ready') {
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

    this.emergencyContactApi.updateEmergencyContact(contact.id, mapEmergencyContactFormToRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (updatedContact) => void this.router.navigate(['/contacts/emergency', updatedContact.id]),
      error: (error: unknown) => this.handleSaveError(error, contact),
    });
  }

  /**
   * Reloads the emergency contact for editing.
   */
  protected retry(): void {
    const contactId = this.route.snapshot.paramMap.get('contactId');

    if (contactId !== null) {
      this.loadContact(contactId);
    }
  }

  /**
   * Loads the emergency contact and fills the form with its current details.
   */
  private loadContact(contactId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.contact.set(null);

    this.emergencyContactApi.getEmergencyContact(contactId).subscribe({
      next: (contact) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || contact.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This emergency contact is not available for the selected patient.');
          return;
        }

        if (!this.canEdit()) {
          this.status.set('forbidden');
          return;
        }

        this.contact.set(contact);
        resetEmergencyContactForm(this.form, contact);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  /**
   * Handles contact loading errors and refreshes patient access when needed.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the emergency contact for editing.'));
  }

  /**
   * Applies form errors and refreshes patient access when the contact cannot be saved.
   */
  private handleSaveError(error: unknown, contact: EmergencyContactResponse): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(contact.patientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to update the emergency contact.'));
  }

  /**
   * Refreshes patient access and returns to the contacts page if the selected patient has changed.
   */
  private recoverPatientAccess(failedPatientRecordId: string | null): void {
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/contacts']);
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
