import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, finalize, switchMap } from 'rxjs';

import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { DOCUMENT_APPROVED_DEIDENTIFIED_TEXT_MAX_LENGTH } from '../../models/document-constraints';
import { DocumentProcessingResultResponse, DocumentResponse } from '../../models/document-model';
import { DocumentApiService } from '../../services/document-api-service';

type ReviewPageStatus = 'loading' | 'ready' | 'recovery' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-deidentification-review',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './deidentification-review.html',
})
export class DeidentificationReview implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly documentApi = inject(DocumentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly document = signal<DocumentResponse | null>(null);
  protected readonly processing = signal<DocumentProcessingResultResponse | null>(null);
  protected readonly status = signal<ReviewPageStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly approvedTextMaximumLength = DOCUMENT_APPROVED_DEIDENTIFIED_TEXT_MAX_LENGTH;

  protected readonly contextMatchesDocument = computed(() => {
    const document = this.document();
    const selectedPatient = this.selectedPatientState.selectedPatient();
    return document !== null && selectedPatient !== null && document.patientRecordId === selectedPatient.patientRecordId;
  });

  protected readonly form = this.formBuilder.group({
    approvedDeidentifiedText: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(DOCUMENT_APPROVED_DEIDENTIFIED_TEXT_MAX_LENGTH),
    ]),
    externalTransmissionApproved: this.formBuilder.nonNullable.control(false, Validators.requiredTrue),
  });

  ngOnInit(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');

    if (documentId === null || documentId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadReview(documentId);
  }

  protected submit(): void {
    this.actionError.set('');
    clearServerFieldErrors(this.form);

    const document = this.document();

    if (document === null || this.status() !== 'ready' || !this.contextMatchesDocument()) {
      return;
    }

    if (!this.authorisation.can(this.selectedPatientState.selectedPatient(), 'document', 'edit')) {
      this.status.set('forbidden');
      return;
    }

    const approvedText = this.form.controls.approvedDeidentifiedText.value;

    if (approvedText.trim().length === 0) {
      this.form.controls.approvedDeidentifiedText.setErrors({
        ...this.form.controls.approvedDeidentifiedText.errors,
        required: true,
      });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.documentApi.summariseDocument(document.id, { approvedDeidentifiedText: approvedText }).pipe(
      finalize(() => this.isSubmitting.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/documents', document.id, 'summary-review']),
      error: (error: unknown) => this.handleSubmissionError(error, document.id),
    });
  }

  protected retryLoad(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');

    if (documentId !== null) {
      this.loadReview(documentId);
    }
  }

  private loadReview(documentId: string, actionMessage = ''): void {
    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set(actionMessage);
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

        if (document.documentType !== 'CONSULTATION_OUTCOME_LETTER') {
          this.status.set('invalid');
          this.errorMessage.set('Privacy review is not available for this document.');
          return EMPTY;
        }

        if (document.status === 'SUMMARISATION_FAILED') {
          this.status.set('recovery');
          return EMPTY;
        }

        if (document.status === 'READY_FOR_SUMMARY_REVIEW') {
          void this.router.navigate(['/documents', document.id, 'summary-review']);
          return EMPTY;
        }

        if (document.status !== 'READY_FOR_DEIDENTIFICATION_REVIEW') {
          this.status.set('invalid');
          this.errorMessage.set(actionMessage || 'This document is not awaiting de-identification review.');
          return EMPTY;
        }

        return this.documentApi.getDocumentProcessing(document.id);
      }),
    ).subscribe({
      next: (processing) => {
        if (processing.machineDeidentifiedText === null) {
          this.status.set('error');
          this.errorMessage.set('De-identified consultation text is not available for review.');
          return;
        }

        this.processing.set(processing);
        this.form.reset({
          approvedDeidentifiedText: processing.machineDeidentifiedText,
          externalTransmissionApproved: false,
        });
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error),
    });
  }

  private handleLoadError(error: unknown): void {
    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.status.set('forbidden');
      this.refreshPatientAccess();
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the de-identification review.'));
  }

  private handleSubmissionError(error: unknown, documentId: string): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 400)) {
      this.actionError.set(getHttpErrorMessage(error, 'Check the de-identified text before continuing.'));
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.status.set('forbidden');
      this.refreshPatientAccess();
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    const message = this.getSummarisationFailureMessage(error);
    this.reloadAfterSubmissionFailure(documentId, message);
  }

  private reloadAfterSubmissionFailure(documentId: string, message: string): void {
    this.documentApi.getDocument(documentId).subscribe({
      next: (document) => {
        this.document.set(document);

        if (document.status === 'SUMMARISATION_FAILED') {
          this.status.set('recovery');
          this.actionError.set(message);
          return;
        }

        if (document.status === 'READY_FOR_SUMMARY_REVIEW') {
          void this.router.navigate(['/documents', document.id, 'summary-review']);
          return;
        }

        if (document.status === 'READY_FOR_DEIDENTIFICATION_REVIEW') {
          this.loadReview(document.id, message);
          return;
        }

        this.status.set('invalid');
        this.errorMessage.set(message);
      },
      error: (reloadError: unknown) => this.handleLoadError(reloadError),
    });
  }

  private getSummarisationFailureMessage(error: unknown): string {
    if (hasHttpStatus(error, 409)) {
      return 'This document was updated while you were working. The latest version has been loaded.';
    }

    if (hasHttpStatus(error, 413)) {
      return 'The consultation text is too long to generate a summary.';
    }

    if (hasHttpStatus(error, 422)) {
      return 'A summary could not be generated from the approved consultation text.';
    }

    if (hasHttpStatus(error, 502)) {
      return 'The summary could not be generated. Please try again.';
    }

    if (hasHttpStatus(error, 503)) {
      return 'Summary generation is temporarily unavailable. Please try again later.';
    }

    if (hasHttpStatus(error, 504)) {
      return 'Summary generation took too long. Please try again.';
    }

    return getHttpErrorMessage(error, 'Summarisation did not complete successfully.');
  }

  private refreshPatientAccess(): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatientState.selectedPatient();

        if (!this.authorisation.can(selectedPatient, 'document', 'edit')) {
          this.status.set('forbidden');
        }
      },
      error: (error: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to refresh your access.'));
      },
    });
  }
}
