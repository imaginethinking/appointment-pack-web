import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, finalize, switchMap } from 'rxjs';

import { applyServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { normaliseOptionalText } from '../../../../shared/utils/formatting';
import { AppointmentAddressInput, AppointmentConfirmationRequest } from '../../../appointments/models/appointment-model';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { DocumentProcessingResultResponse, DocumentResponse } from '../../models/document-model';
import { DocumentApiService } from '../../services/document-api-service';

type AppointmentReviewStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-appointment-review',
  imports: [ReactiveFormsModule, RouterLink],
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

  protected readonly contextMatchesDocument = computed(() => {
    const document = this.document();
    const selectedPatient = this.selectedPatientState.selectedPatient();
    return document !== null && selectedPatient !== null && document.patientRecordId === selectedPatient.patientRecordId;
  });

  protected readonly canConfirm = computed(() => {
    if (!this.contextMatchesDocument()) {
      return false;
    }
    const selectedPatient = this.selectedPatientState.selectedPatient();
    return this.authorisation.can(selectedPatient, 'document', 'edit') && this.authorisation.can(selectedPatient, 'appointment', 'edit');
  });

  protected readonly canReject = computed(() => {
    if (!this.contextMatchesDocument()) {
      return false;
    }
    return this.authorisation.can(this.selectedPatientState.selectedPatient(), 'document', 'edit');
  });

  protected readonly form = this.formBuilder.group({
    date: this.formBuilder.nonNullable.control('', Validators.required),
    startTime: this.formBuilder.nonNullable.control('', Validators.required),
    endTime: this.formBuilder.nonNullable.control(''),
    service: this.formBuilder.nonNullable.control('', Validators.maxLength(250)),
    appointmentType: this.formBuilder.nonNullable.control('', Validators.maxLength(250)),
    clinicianOrTeam: this.formBuilder.nonNullable.control('', Validators.maxLength(250)),
    locationName: this.formBuilder.nonNullable.control('', Validators.maxLength(250)),
    address: this.formBuilder.group({
      addressLine1: this.formBuilder.nonNullable.control('', Validators.maxLength(150)),
      addressLine2: this.formBuilder.nonNullable.control('', Validators.maxLength(150)),
      townCity: this.formBuilder.nonNullable.control('', Validators.maxLength(100)),
      county: this.formBuilder.nonNullable.control('', Validators.maxLength(100)),
      postcode: this.formBuilder.nonNullable.control('', Validators.maxLength(20)),
      country: this.formBuilder.nonNullable.control('', Validators.maxLength(100)),
    }),
    notes: this.formBuilder.nonNullable.control('', Validators.maxLength(2000)),
  });

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
    const document = this.document();

    if (document === null || this.status() !== 'ready') {
      return;
    }

    if (!this.canConfirm()) {
      this.actionError.set('You do not have permission to confirm appointments for this patient.');
      return;
    }

    this.validateTimes();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: AppointmentConfirmationRequest = {
      date: value.date,
      startTime: value.startTime,
      endTime: normaliseOptionalText(value.endTime),
      service: normaliseOptionalText(value.service),
      appointmentType: normaliseOptionalText(value.appointmentType),
      clinicianOrTeam: normaliseOptionalText(value.clinicianOrTeam),
      locationName: normaliseOptionalText(value.locationName),
      address: this.buildAddress(value.address),
      notes: normaliseOptionalText(value.notes),
    };

    this.isConfirming.set(true);
    this.documentApi.confirmAppointment(document.id, request).pipe(
      finalize(() => this.isConfirming.set(false)),
    ).subscribe({
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
    this.documentApi.rejectAppointment(document.id).pipe(
      finalize(() => this.isRejecting.set(false)),
    ).subscribe({
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
          this.errorMessage.set('This document does not belong to the currently selected patient.');
          return EMPTY;
        }

        if (document.documentType !== 'APPOINTMENT_LETTER' || document.status !== 'READY_FOR_APPOINTMENT_REVIEW') {
          this.status.set('invalid');
          this.errorMessage.set(conflictMessage ?? 'This document is not awaiting appointment review.');
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
        this.form.reset({
          date: details.date ?? '',
          startTime: this.toTimeInput(details.startTime),
          endTime: this.toTimeInput(details.endTime),
          service: details.service ?? '',
          appointmentType: details.appointmentType ?? '',
          clinicianOrTeam: details.clinicianOrTeam ?? '',
          locationName: details.locationName ?? '',
          address: {
            addressLine1: details.address?.addressLine1 ?? '',
            addressLine2: details.address?.addressLine2 ?? '',
            townCity: details.address?.townCity ?? '',
            county: details.address?.county ?? '',
            postcode: details.address?.postcode ?? '',
            country: details.address?.country ?? '',
          },
          notes: '',
        });
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error),
    });
  }

  private validateTimes(): void {
    const startTime = this.form.controls.startTime.value;
    const endTime = this.form.controls.endTime.value;
    this.form.controls.endTime.setErrors(null);

    if (startTime.length === 0 || endTime.length === 0) {
      return;
    }

    if (endTime <= startTime) {
      this.form.controls.endTime.setErrors({ afterStart: true });
    }
  }

  private buildAddress(value: {
    addressLine1: string;
    addressLine2: string;
    townCity: string;
    county: string;
    postcode: string;
    country: string;
  }): AppointmentAddressInput | null {
    const address: AppointmentAddressInput = {
      addressLine1: normaliseOptionalText(value.addressLine1),
      addressLine2: normaliseOptionalText(value.addressLine2),
      townCity: normaliseOptionalText(value.townCity),
      county: normaliseOptionalText(value.county),
      postcode: normaliseOptionalText(value.postcode),
      country: normaliseOptionalText(value.country),
    };
    return Object.values(address).some((field) => field !== null) ? address : null;
  }

  private toTimeInput(value: string | null): string {
    return value === null || value.length < 5 ? '' : value.substring(0, 5);
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
      this.loadReview(document.id, 'The document state changed or an appointment already exists for this document. The latest document state has been reloaded.');
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
      this.loadReview(document.id, 'The document state changed before the appointment details could be rejected. The latest document state has been reloaded.');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to reject the appointment details.'));
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
          this.actionError.set('You no longer have permission to confirm appointments for this patient.');
          return;
        }

        this.actionError.set('Your patient access changed. Reload the document before continuing.');
      },
      error: (refreshError: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh your patient access.'));
      },
    });
  }
}
