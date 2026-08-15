import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, finalize, switchMap } from 'rxjs';

import { applyServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import {
  DocumentProcessingResultResponse,
  DocumentResponse,
  getDocumentTypeLabel,
  getSummarySourceLabel,
} from '../../models/document-model';
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

  protected readonly canEditDocument = computed(() => this.authorisation.can(this.selectedPatientState.selectedPatient(), 'document', 'edit'));
  protected readonly canWriteHistory = computed(() => this.authorisation.can(this.selectedPatientState.selectedPatient(), 'history', 'edit'));
  protected readonly canAccept = computed(() => this.canEditDocument() && this.canWriteHistory());
  protected readonly canRetry = computed(() => this.status() === 'failed' && this.canEditDocument() && !this.isRetrying());
  protected readonly canReject = computed(() => this.status() === 'ready' && this.canEditDocument());

  protected readonly form = this.formBuilder.group({
    reviewedSummary: this.formBuilder.nonNullable.control('', Validators.required),
    historyTitle: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(200)]),
    historyDate: this.formBuilder.nonNullable.control('', Validators.required),
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
    this.actionError.set('');
    this.manualSummaryMode.set(true);
    this.form.controls.reviewedSummary.setValue('');
    this.form.controls.reviewedSummary.markAsUntouched();
  }

  protected cancelManualSummary(): void {
    if (this.status() !== 'failed') {
      return;
    }
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
      this.errorMessage.set('The approved de-identified text required for retry is not available.');
      return;
    }

    this.isRetrying.set(true);
    this.documentApi.summariseDocument(document.id, { approvedDeidentifiedText: approvedText }).pipe(
      finalize(() => this.isRetrying.set(false)),
    ).subscribe({
      next: (processingResult) => {
        if (processingResult.status !== 'READY_FOR_SUMMARY_REVIEW' || processingResult.generatedSummary === null || processingResult.generatedSummary.trim().length === 0) {
          this.status.set('error');
          this.errorMessage.set('Summarisation completed without a reviewable summary.');
          return;
        }

        this.processing.set(processingResult);
        this.document.update((currentDocument) => currentDocument === null ? null : { ...currentDocument, status: processingResult.status });
        this.manualSummaryMode.set(false);
        this.form.reset({ reviewedSummary: processingResult.generatedSummary, historyTitle: '', historyDate: '' });
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleRetryError(error, document),
    });
  }

  protected accept(): void {
    this.actionError.set('');
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
      error: (error: unknown) => this.handleAcceptError(error, document),
    });
  }

  protected reject(): void {
    this.actionError.set('');
    const document = this.document();

    if (document === null || !this.canReject()) {
      return;
    }

    if (!window.confirm('Reject this summary? No medical-history entry will be created.')) {
      return;
    }

    this.isRejecting.set(true);
    this.documentApi.rejectDocumentSummary(document.id).pipe(
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

  private loadReview(documentId: string, stateChangeMessage: string | null = null): void {
    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set(stateChangeMessage ?? '');
    this.document.set(null);
    this.processing.set(null);
    this.manualSummaryMode.set(false);

    this.documentApi.getDocument(documentId).pipe(
      switchMap((document) => {
        this.document.set(document);
        const selectedPatient = this.selectedPatientState.selectedPatient();

        if (selectedPatient === null || selectedPatient.patientRecordId !== document.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This document does not belong to the currently selected patient.');
          return EMPTY;
        }

        if (document.documentType !== 'CONSULTATION_OUTCOME_LETTER') {
          this.status.set('invalid');
          this.errorMessage.set('Only consultation outcome letters use summary review.');
          return EMPTY;
        }

        if (document.status !== 'READY_FOR_SUMMARY_REVIEW' && document.status !== 'SUMMARISATION_FAILED') {
          this.status.set('invalid');
          this.errorMessage.set(stateChangeMessage ?? 'This consultation document is not awaiting summary review or summarisation recovery.');
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
        this.errorMessage.set(stateChangeMessage ?? 'The document processing state changed while the review was loading.');
      },
      error: (error: unknown) => this.handleLoadError(error),
    });
  }

  private prepareGeneratedSummary(processing: DocumentProcessingResultResponse): void {
    if (processing.generatedSummary === null || processing.generatedSummary.trim().length === 0) {
      this.status.set('error');
      this.errorMessage.set('The processing result does not contain a generated summary.');
      return;
    }

    this.form.reset({ reviewedSummary: processing.generatedSummary, historyTitle: '', historyDate: '' });
    this.manualSummaryMode.set(false);
    this.status.set('ready');
  }

  private prepareFailedSummary(processing: DocumentProcessingResultResponse): void {
    if (processing.approvedDeidentifiedText === null || processing.approvedDeidentifiedText.length === 0) {
      this.status.set('error');
      this.errorMessage.set('The approved de-identified text required for recovery is not available.');
      return;
    }

    this.form.reset({ reviewedSummary: '', historyTitle: '', historyDate: '' });
    this.manualSummaryMode.set(false);
    this.status.set('failed');
  }

  private validateNonBlankFields(): void {
    if (this.form.controls.reviewedSummary.value.trim().length === 0) {
      this.form.controls.reviewedSummary.setErrors({ required: true });
    }
    if (this.form.controls.historyTitle.value.trim().length === 0) {
      this.form.controls.historyTitle.setErrors({ required: true });
    }
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the summary review.'));
  }

  private handleRetryError(error: unknown, document: DocumentResponse): void {
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
      this.loadReview(document.id, 'The document state changed before summarisation could be retried. The latest document state has been reloaded.');
      return;
    }

    if (hasHttpStatus(error, 413)) {
      this.actionError.set('The approved de-identified text is too large to summarise.');
      return;
    }

    if (hasHttpStatus(error, 502)) {
      this.actionError.set('The external summarisation service returned an invalid response. You can retry again or enter a manual summary.');
      return;
    }

    if (hasHttpStatus(error, 503)) {
      this.actionError.set('External summarisation is currently unavailable. You can retry later or enter a manual summary.');
      return;
    }

    if (hasHttpStatus(error, 504)) {
      this.actionError.set('External summarisation timed out. You can retry again or enter a manual summary.');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to retry summarisation.'));
  }

  private handleAcceptError(error: unknown, document: DocumentResponse): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 400)) {
      this.actionError.set(getHttpErrorMessage(error, 'The summary acceptance details are invalid.'));
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
      this.loadReview(document.id, 'The document state changed or a medical-history entry already exists for this document. The latest document state has been reloaded.');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to accept the summary.'));
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
      this.loadReview(document.id, 'The document state changed before the summary could be rejected. The latest document state has been reloaded.');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to reject the summary.'));
  }

  private refreshPatientAccess(requireHistoryEdit: boolean): void {
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

        if (requireHistoryEdit && !this.authorisation.can(selectedPatient, 'history', 'edit')) {
          this.actionError.set('You no longer have permission to add entries to this patient’s medical history.');
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
