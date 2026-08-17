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
import { HealthcareContactFormFields } from '../../components/healthcare-contact-form-fields/healthcare-contact-form-fields';
import { createHealthcareContactForm, mapHealthcareContactFormToRequest, resetHealthcareContactForm } from '../../forms/healthcare-contact-form';
import { HealthcareContactResponse } from '../../models/healthcare-contact-model';
import { HealthcareContactApiService } from '../../services/healthcare-contact-api-service';

type HealthcareContactEditStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-healthcare-contact-edit',
  imports: [ReactiveFormsModule, RouterLink, HealthcareContactFormFields],
  templateUrl: './healthcare-contact-edit.html',
})
export class HealthcareContactEdit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly healthcareContactApi = inject(HealthcareContactApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly contact = signal<HealthcareContactResponse | null>(null);
  protected readonly status = signal<HealthcareContactEditStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly isSaving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'contact', 'edit'));
  protected readonly form = createHealthcareContactForm(this.formBuilder);

  constructor() {
    effect(() => {
      const contact = this.contact();
      const selectedPatient = this.selectedPatient();

      if (contact !== null && (selectedPatient === null || contact.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/contacts']);
      }
    });
  }

  ngOnInit(): void {
    const contactId = this.route.snapshot.paramMap.get('contactId');

    if (contactId === null || contactId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadContact(contactId);
  }

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

    this.healthcareContactApi.updateHealthcareContact(contact.id, mapHealthcareContactFormToRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (updatedContact) => void this.router.navigate(['/contacts/healthcare', updatedContact.id]),
      error: (error: unknown) => this.handleSaveError(error, contact),
    });
  }

  protected retry(): void {
    const contactId = this.route.snapshot.paramMap.get('contactId');

    if (contactId !== null) {
      this.loadContact(contactId);
    }
  }

  private loadContact(contactId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.contact.set(null);

    this.healthcareContactApi.getHealthcareContact(contactId).subscribe({
      next: (contact) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || contact.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This healthcare contact is not available for the selected patient.');
          return;
        }

        if (!this.canEdit()) {
          this.status.set('forbidden');
          return;
        }

        this.contact.set(contact);
        resetHealthcareContactForm(this.form, contact);
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the healthcare contact for editing.'));
  }

  private handleSaveError(error: unknown, contact: HealthcareContactResponse): void {
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

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to update the healthcare contact.'));
  }

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
