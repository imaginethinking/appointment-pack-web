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

type SummaryReviewStatus =
  | 'loading'
  | 'ready'
  | 'invalid'
  | 'not-found'
  | 'forbidden'
  | 'error';

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

  protected readonly canAccept = computed(() => {
    const selectedPatient = this.selectedPatientState.selectedPatient();

    return (
      this.authorisation.can(
        selectedPatient,
        'document',
        'edit',
      ) &&
      this.authorisation.can(
        selectedPatient,
        'history',
        'edit',
      )
    );
  });

  protected readonly canReject = computed(() =>
    this.authorisation.can(
      this.selectedPatientState.selectedPatient(),
      'document',
      'edit',
    ),
  );

  protected readonly form = this.formBuilder.group({
    reviewedSummary: this.formBuilder.nonNullable.control('', [
      Validators.required,
    ]),
    historyTitle: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(200),
    ]),
    historyDate: this.formBuilder.nonNullable.control('', [
      Validators.required,
    ]),
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

  protected accept(): void {
    this.actionError.set('');

    const document = this.document();

    if (
      document === null ||
      this.status() !== 'ready' ||
      !this.canAccept()
    ) {
      return;
    }

    this.validateNonBlankFields();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue();

    this.isAccepting.set(true);

    this.documentApi
      .acceptDocumentSummary(
        document.id,
        request,
      )
      .pipe(
        finalize(() => {
          this.isAccepting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate([
            '/documents',
            document.id,
          ]);
        },
        error: (error: unknown) => {
          this.handleAcceptError(error);
        },
      });
  }

  protected reject(): void {
    this.actionError.set('');

    const document = this.document();

    if (
      document === null ||
      this.status() !== 'ready' ||
      !this.canReject()
    ) {
      return;
    }

    const confirmed = window.confirm(
      'Reject this summary? No medical-history entry will be created.',
    );

    if (!confirmed) {
      return;
    }

    this.isRejecting.set(true);

    this.documentApi
      .rejectDocumentSummary(document.id)
      .pipe(
        finalize(() => {
          this.isRejecting.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate([
            '/documents',
            document.id,
          ]);
        },
        error: (error: unknown) => {
          this.handleRejectError(error);
        },
      });
  }

  protected retryLoad(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');

    if (documentId !== null) {
      this.loadReview(documentId);
    }
  }

  private loadReview(documentId: string): void {
    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set('');
    this.document.set(null);
    this.processing.set(null);

    this.documentApi
      .getDocument(documentId)
      .pipe(
        switchMap((document) => {
          this.document.set(document);

          const selectedPatient =
            this.selectedPatientState.selectedPatient();

          if (
            selectedPatient === null ||
            selectedPatient.patientRecordId !==
            document.patientRecordId
          ) {
            this.status.set('invalid');

            this.errorMessage.set(
              'This document does not belong to the currently selected patient.',
            );

            return EMPTY;
          }

          if (
            document.status !==
            'READY_FOR_SUMMARY_REVIEW'
          ) {
            this.status.set('invalid');

            this.errorMessage.set(
              'This document is not awaiting summary review.',
            );

            return EMPTY;
          }

          return this.documentApi.getDocumentProcessing(
            document.id,
          );
        }),
      )
      .subscribe({
        next: (processing) => {
          if (
            processing.generatedSummary === null ||
            processing.generatedSummary.trim().length === 0
          ) {
            this.status.set('error');

            this.errorMessage.set(
              'The processing result does not contain a generated summary.',
            );

            return;
          }

          this.processing.set(processing);

          this.form.reset({
            reviewedSummary:
            processing.generatedSummary,
            historyTitle: '',
            historyDate: '',
          });

          this.status.set('ready');
        },
        error: (error: unknown) => {
          this.handleLoadError(error);
        },
      });
  }

  private validateNonBlankFields(): void {
    if (
      this.form.controls.reviewedSummary.value
        .trim()
        .length === 0
    ) {
      this.form.controls.reviewedSummary.setErrors({
        required: true,
      });
    }

    if (
      this.form.controls.historyTitle.value
        .trim()
        .length === 0
    ) {
      this.form.controls.historyTitle.setErrors({
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
      this.refreshPatientContext(false);

      return;
    }

    this.status.set('error');

    this.errorMessage.set(
      getHttpErrorMessage(
        error,
        'Unable to load the summary review.',
      ),
    );
  }

  private handleAcceptError(error: unknown): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 400)) {
      this.actionError.set(
        getHttpErrorMessage(
          error,
          'The summary acceptance details are invalid.',
        ),
      );

      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.refreshPatientContext(true);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    if (hasHttpStatus(error, 409)) {
      this.status.set('invalid');

      this.errorMessage.set(
        'The document state changed or a medical-history entry already exists for this document. Return to document details to reload its current state.',
      );

      return;
    }

    this.actionError.set(
      getHttpErrorMessage(
        error,
        'Unable to accept the summary.',
      ),
    );
  }

  private handleRejectError(error: unknown): void {
    if (hasHttpStatus(error, 403)) {
      this.refreshPatientContext(false);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    if (hasHttpStatus(error, 409)) {
      this.status.set('invalid');

      this.errorMessage.set(
        'The document state changed before the summary could be rejected. Return to document details to reload its current state.',
      );

      return;
    }

    this.actionError.set(
      getHttpErrorMessage(
        error,
        'Unable to reject the summary.',
      ),
    );
  }

  private refreshPatientContext(
    acceptanceAttempt: boolean,
  ): void {
    this.patientContextCoordinator.load().subscribe({
      next: () => {
        const selectedPatient =
          this.selectedPatientState.selectedPatient();

        if (
          !this.authorisation.can(
            selectedPatient,
            'document',
            'edit',
          )
        ) {
          this.status.set('forbidden');
          return;
        }

        if (
          acceptanceAttempt &&
          !this.authorisation.can(
            selectedPatient,
            'history',
            'edit',
          )
        ) {
          this.actionError.set(
            'You no longer have permission to add entries to this patient’s medical history.',
          );

          return;
        }

        this.actionError.set(
          'Your patient access changed. Reload the document before continuing.',
        );
      },
      error: (refreshError: unknown) => {
        this.status.set('error');

        this.errorMessage.set(
          getHttpErrorMessage(
            refreshError,
            'Unable to refresh your patient access.',
          ),
        );
      },
    });
  }
}
