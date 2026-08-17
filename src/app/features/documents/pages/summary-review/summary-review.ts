import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, finalize, switchMap } from 'rxjs';

import { pastOrPresentDateValidator } from '../../../../core/forms/date-validators';
import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { DOCUMENT_HISTORY_TITLE_MAX_LENGTH, DOCUMENT_REVIEWED_SUMMARY_MAX_LENGTH } from '../../models/document-constraints';
import { DocumentProcessingResultResponse, DocumentResponse, getDocumentTypeLabel, getSummarySourceLabel } from '../../models/document-model';
import { DocumentApiService } from '../../services/document-api-service';

type SummaryReviewStatus = 'loading' | 'ready' | 'failed' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-summary-review',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './summary-review.html',
})
export class SummaryReview implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly documentApi = inject(DocumentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly document = signal<DocumentResponse | null>(null);
  protected readonly processing = signal<DocumentProcessingResultResponse | null>(null);
  protected readonly status = signal<SummaryReviewStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isAccepting = signal(false);
  protected readonly isRejecting = signal(false);
  protected readonly isRetrying = signal(false);
  protected readonly manualSummaryMode = signal(false);
  protected readonly reviewedSummaryMaximumLength = DOCUMENT_REVIEWED_SUMMARY_MAX_LENGTH;
  protected readonly historyTitleMaximumLength = DOCUMENT_HISTORY_TITLE_MAX_LENGTH;

  protected readonly canEditDocument = computed(() => this.authorisation.can(this.selectedPatientState.selectedPatient(), 'document', 'edit'));
  protected readonly canWriteHistory = computed(() => this.authorisation.can(this.selectedPatientState.selectedPatient(), 'history', 'edit'));
  protected readonly canAccept = computed(() => this.canEditDocument() && this.canWriteHistory());
  protected readonly canRetry = computed(() => this.status() === 'failed' && this.canEditDocument() && !this.isRetrying());
  protected readonly canReject = computed(() => this.status() === 'ready' && this.canEditDocument());

  protected readonly form = this.formBuilder.group({
    reviewedSummary: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(DOCUMENT_REVIEWED_SUMMARY_MAX_LENGTH),
    ]),
    historyTitle: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(DOCUMENT_HISTORY_TITLE_MAX_LENGTH),
    ]),
    historyDate: this.formBuilder.nonNullable.control('', [Validators.required, pastOrPresentDateValidator]),
  });

  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly getSummarySourceLabel = getSummarySourceLabel;

  ngOnInit(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');

    if (documentId === null || documentId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadReview(documentId);
  }

  protected enableManualSummary(): void {
    if (this.status() !== 'failed') {
      return;
    }

    clearServerFieldErrors(this.form);
    this.actionError.set('');
    this.manualSummaryMode.set(true);
    this.form.controls.reviewedSummary.setValue('');
    this.form.controls.reviewedSummary.markAsUntouched();
  }

  protected cancelManualSummary(): void {
    if (this.status() !== 'failed') {
      return;
    }

    clearServerFieldErrors(this.form);
    this.actionError.set('');
    this.manualSummaryMode.set(false);
    this.form.controls.reviewedSummary.setValue('');
  }

  protected retrySummarisation(): void {
    this.actionError.set('');

    const document = this.document();
    const processing = this.processing();

    if (document === null || processing === null || this.status() !== 'failed' || !this.canRetry()) {
      return;
    }

    const approvedText = processing.approvedDeidentifiedText;

    if (approvedText === null || approvedText.length === 0) {
      this.status.set('error');
      this.errorMessage.set('The previously approved consultation text is not available.');
      return;
    }

    this.isRetrying.set(true);

    this.documentApi.summariseDocument(document.id, { approvedDeidentifiedText: approvedText }).pipe(
      finalize(() => this.isRetrying.set(false)),
    ).subscribe({
      next: (processingResult) => {
        if (processingResult.status !== 'READY_FOR_SUMMARY_REVIEW' || processingResult.generatedSummary === null || processingResult.generatedSummary.trim().length === 0) {
          this.loadReview(document.id, 'A reviewable summary was not created. The latest document information has been loaded.');
          return;
        }

        this.processing.set(processingResult);
        this.document.update((currentDocument) => currentDocument === null ? null : { ...currentDocument, status: processingResult.status });
        this.manualSummaryMode.set(false);
        this.form.reset({ reviewedSummary: processingResult.generatedSummary, historyTitle: '', historyDate: '' });
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleRetryError(error, document.id),
    });
  }

  protected accept(): void {
    this.actionError.set('');
    clearServerFieldErrors(this.form);

    const document = this.document();

    if (document === null || !this.canAccept()) {
      return;
    }

    const acceptingGeneratedSummary = this.status() === 'ready';
    const acceptingManualSummary = this.status() === 'failed' && this.manualSummaryMode();

    if (!acceptingGeneratedSummary && !acceptingManualSummary) {
      return;
    }

    this.validateNonBlankFields();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.isAccepting.set(true);

    this.documentApi.acceptDocumentSummary(document.id, {
      reviewedSummary: value.reviewedSummary.trim(),
      historyTitle: value.historyTitle.trim(),
      historyDate: value.historyDate,
    }).pipe(
      finalize(() => this.isAccepting.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/documents', document.id]),
      error: (error: unknown) => this.handleAcceptError(error, document.id),
    });
  }

  protected reject(): void {
    this.actionError.set('');

    const document = this.document();

    if (document === null || !this.canReject()) {
      return;
    }

    if (!window.confirm('Reject this summary? It will not be added to medical history.')) {
      return;
    }

    this.isRejecting.set(true);

    this.documentApi.rejectDocumentSummary(document.id).pipe(
      finalize(() => this.isRejecting.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/documents', document.id]),
      error: (error: unknown) => this.handleRejectError(error, document.id),
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
    this.manualSummaryMode.set(false);

    this.documentApi.getDocument(documentId).pipe(
      switchMap((document) => {
        this.document.set(document);

        const selectedPatient = this.selectedPatientState.selectedPatient();

        if (selectedPatient === null || selectedPatient.patientRecordId !== document.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This document is not available for the selected patient.');
          return EMPTY;
        }

        if (document.documentType !== 'CONSULTATION_OUTCOME_LETTER') {
          this.status.set('invalid');
          this.errorMessage.set('Summary review is not available for this document.');
          return EMPTY;
        }

        if (document.status !== 'READY_FOR_SUMMARY_REVIEW' && document.status !== 'SUMMARISATION_FAILED') {
          this.status.set('invalid');
          this.errorMessage.set(actionMessage || 'This document is not currently ready for summary review.');
          return EMPTY;
        }

        return this.documentApi.getDocumentProcessing(document.id);
      }),
    ).subscribe({
      next: (processing) => {
        this.processing.set(processing);

        if (processing.status === 'READY_FOR_SUMMARY_REVIEW') {
          this.prepareGeneratedSummary(processing);
          return;
        }

        if (processing.status === 'SUMMARISATION_FAILED') {
          this.prepareFailedSummary(processing);
          return;
        }

        this.status.set('invalid');
        this.errorMessage.set(actionMessage || 'This document was updated while the review was loading. Please try again.');
      },
      error: (error: unknown) => this.handleLoadError(error),
    });
  }

  private prepareGeneratedSummary(processing: DocumentProcessingResultResponse): void {
    if (processing.generatedSummary === null || processing.generatedSummary.trim().length === 0) {
      this.status.set('error');
      this.errorMessage.set('A consultation summary is not available for review.');
      return;
    }

    this.form.reset({ reviewedSummary: processing.generatedSummary, historyTitle: '', historyDate: '' });
    this.manualSummaryMode.set(false);
    this.status.set('ready');
  }

  private prepareFailedSummary(processing: DocumentProcessingResultResponse): void {
    if (processing.approvedDeidentifiedText === null || processing.approvedDeidentifiedText.length === 0) {
      this.status.set('error');
      this.errorMessage.set('The previously approved consultation text is not available.');
      return;
    }

    this.form.reset({ reviewedSummary: '', historyTitle: '', historyDate: '' });
    this.manualSummaryMode.set(false);
    this.status.set('failed');
  }

  private validateNonBlankFields(): void {
    if (this.form.controls.reviewedSummary.value.trim().length === 0) {
      this.form.controls.reviewedSummary.setErrors({
        ...this.form.controls.reviewedSummary.errors,
        required: true,
      });
    }

    if (this.form.controls.historyTitle.value.trim().length === 0) {
      this.form.controls.historyTitle.setErrors({
        ...this.form.controls.historyTitle.errors,
        required: true,
      });
    }
  }

  private handleLoadError(error: unknown): void {
    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.status.set('forbidden');
      this.refreshPatientAccess(false);
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the consultation summary.'));
  }

  private handleRetryError(error: unknown, documentId: string): void {
    if (hasHttpStatus(error, 403)) {
      this.refreshPatientAccess(false);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.loadReview(documentId, this.getRetryFailureMessage(error));
  }

  private handleAcceptError(error: unknown, documentId: string): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 400)) {
      this.actionError.set(getHttpErrorMessage(error, 'Check the summary and medical history details before continuing.'));
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.refreshPatientAccess(true);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    if (hasHttpStatus(error, 409)) {
      this.loadReview(documentId, 'This document was updated while you were working. The latest version has been loaded.');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to add the summary to medical history.'));
  }

  private handleRejectError(error: unknown, documentId: string): void {
    if (hasHttpStatus(error, 403)) {
      this.refreshPatientAccess(false);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    if (hasHttpStatus(error, 409)) {
      this.loadReview(documentId, 'This document was updated while you were working. The latest version has been loaded.');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to reject the summary.'));
  }

  private getRetryFailureMessage(error: unknown): string {
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
      return 'The summary could not be generated. Try again or enter it manually.';
    }

    if (hasHttpStatus(error, 503)) {
      return 'Summary generation is temporarily unavailable. Try again later or enter it manually.';
    }

    if (hasHttpStatus(error, 504)) {
      return 'Summary generation took too long. Try again or enter it manually.';
    }

    return getHttpErrorMessage(error, 'Unable to generate the consultation summary.');
  }

  private refreshPatientAccess(acceptanceAttempt: boolean): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatientState.selectedPatient();

        if (!this.authorisation.can(selectedPatient, 'document', 'edit')) {
          this.status.set('forbidden');
          return;
        }

        if (acceptanceAttempt && !this.authorisation.can(selectedPatient, 'history', 'edit')) {
          this.actionError.set('Your current access does not allow this summary to be added to medical history.');
          return;
        }

        this.actionError.set('Your access has changed. Reload this document before continuing.');
      },
      error: (refreshError: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh your access.'));
      },
    });
  }
}
