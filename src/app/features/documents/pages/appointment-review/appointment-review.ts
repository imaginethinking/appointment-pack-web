import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, finalize, switchMap } from 'rxjs';

import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { AppointmentFormFields } from '../../../appointments/components/appointment-form-fields/appointment-form-fields';
import { createAppointmentForm, mapAppointmentFormToRequest, resetAppointmentForm } from '../../../appointments/forms/appointment-form';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { DocumentProcessingResultResponse, DocumentResponse } from '../../models/document-model';
import { DocumentApiService } from '../../services/document-api-service';

type AppointmentReviewStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-appointment-review',
  imports: [ReactiveFormsModule, RouterLink, AppointmentFormFields],
  templateUrl: './appointment-review.html',
})
export class AppointmentReview implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly documentApi = inject(DocumentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly document = signal<DocumentResponse | null>(null);
  protected readonly processing = signal<DocumentProcessingResultResponse | null>(null);
  protected readonly status = signal<AppointmentReviewStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isConfirming = signal(false);
  protected readonly isRejecting = signal(false);
  protected readonly form = createAppointmentForm(this.formBuilder);

  protected readonly contextMatchesDocument = computed(() => {
    const document = this.document();
    const selectedPatient = this.selectedPatientState.selectedPatient();

    return (
      document !== null &&
      selectedPatient !== null &&
      document.patientRecordId === selectedPatient.patientRecordId
    );
  });

  protected readonly canConfirm = computed(() => {
    if (!this.contextMatchesDocument()) {
      return false;
    }

    const selectedPatient = this.selectedPatientState.selectedPatient();

    return (
      this.authorisation.can(selectedPatient, 'document', 'edit') &&
      this.authorisation.can(selectedPatient, 'appointment', 'edit')
    );
  });

  protected readonly canReject = computed(() => {
    if (!this.contextMatchesDocument()) {
      return false;
    }

    return this.authorisation.can(this.selectedPatientState.selectedPatient(), 'document', 'edit');
  });

  constructor() {
    effect(() => {
      this.redirectIfPatientContextChanged();
    });
  }

  ngOnInit(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');

    if (documentId === null || documentId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadReview(documentId);
  }

  protected confirm(): void {
    this.actionError.set('');
    clearServerFieldErrors(this.form);

    const document = this.document();

    if (document === null || this.status() !== 'ready') {
      return;
    }

    if (!this.canConfirm()) {
      this.actionError.set('Your current access does not allow an appointment to be added.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isConfirming.set(true);

    this.documentApi.confirmAppointment(document.id, mapAppointmentFormToRequest(this.form))
      .pipe(finalize(() => this.isConfirming.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/documents', document.id]),
        error: (error: unknown) => this.handleConfirmError(error, document),
      });
  }

  protected reject(): void {
    this.actionError.set('');

    const document = this.document();

    if (document === null || this.status() !== 'ready' || !this.canReject()) {
      return;
    }

    if (!window.confirm('Reject these extracted appointment details? No appointment will be created.')) {
      return;
    }

    this.isRejecting.set(true);

    this.documentApi.rejectAppointment(document.id)
      .pipe(finalize(() => this.isRejecting.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/documents', document.id]),
        error: (error: unknown) => this.handleRejectError(error, document),
      });
  }

  protected retryLoad(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');

    if (documentId !== null) {
      this.loadReview(documentId);
    }
  }

  private loadReview(documentId: string, conflictMessage: string | null = null): void {
    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set(conflictMessage ?? '');
    this.document.set(null);
    this.processing.set(null);

    this.documentApi.getDocument(documentId).pipe(
        switchMap((document) => {
          this.document.set(document);

          const selectedPatient = this.selectedPatientState.selectedPatient();

          if (selectedPatient === null || document.patientRecordId !== selectedPatient.patientRecordId) {
            this.status.set('invalid');
            this.errorMessage.set('This document is not available for the selected patient.');
            return EMPTY;
          }

          if (document.documentType !== 'APPOINTMENT_LETTER' || document.status !== 'READY_FOR_APPOINTMENT_REVIEW') {
            this.status.set('invalid');
            this.errorMessage.set(conflictMessage ?? 'This document is not awaiting appointment review.',);
            return EMPTY;
          }

          return this.documentApi.getDocumentProcessing(document.id);
        }),
      ).subscribe({
        next: (processing) => {
          const details = processing.appointmentDetails;

          if (details === null) {
            this.status.set('error');
            this.errorMessage.set('The processing result does not contain appointment details.');
            return;
          }

          this.processing.set(processing);

          resetAppointmentForm(this.form, {
            ...details,
            notes: null,
          });

          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error),
      });
  }

  private handleLoadError(error: unknown): void {
    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      this.refreshPatientAccess(false);
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.status.set('forbidden');
      this.refreshPatientAccess(false);
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the appointment review.'));
  }

  private handleConfirmError(error: unknown, document: DocumentResponse): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 400)) {
      this.actionError.set(getHttpErrorMessage(error, 'The appointment details are invalid.'));
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.refreshPatientAccess(true);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      this.refreshPatientAccess(true);
      return;
    }

    if (hasHttpStatus(error, 409)) {
      this.loadReview(
        document.id,
        'This document was updated while you were working. The latest version has been loaded.',
      );
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to confirm the appointment.'));
  }

  private handleRejectError(error: unknown, document: DocumentResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.refreshPatientAccess(false);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      this.refreshPatientAccess(false);
      return;
    }

    if (hasHttpStatus(error, 409)) {
      this.loadReview(
        document.id,
        'This document was updated while you were working. The latest version has been loaded.',
      );
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to reject the appointment details.'));
  }

  private redirectIfPatientContextChanged(): void {
    const document = this.document();
    const selectedPatient = this.selectedPatientState.selectedPatient();

    if (
      document === null ||
      selectedPatient === null ||
      document.patientRecordId === selectedPatient.patientRecordId
    ) {
      return;
    }

    this.document.set(null);
    this.processing.set(null);
    this.status.set('loading');
    void this.router.navigate(['/documents']);
  }

  private refreshPatientAccess(requireAppointmentEdit: boolean): void {
    const failedPatientRecordId = this.document()?.patientRecordId ?? null;

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatientState.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/documents']);
          return;
        }

        if (!this.authorisation.can(selectedPatient, 'document', 'edit')) {
          this.status.set('forbidden');
          return;
        }

        if (requireAppointmentEdit && !this.authorisation.can(selectedPatient, 'appointment', 'edit')) {
          this.actionError.set('Your current access does not allow an appointment to be added.');
          return;
        }

        this.actionError.set('Your access has changed. Reload the document before continuing.');
      },
      error: (refreshError: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh your patient access.'),);
      },
    });
  }
}
