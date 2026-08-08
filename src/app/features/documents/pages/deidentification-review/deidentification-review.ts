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
} from '../../models/document-model';
import { DocumentApiService } from '../../services/document-api-service';

type ReviewPageStatus =
  | 'loading'
  | 'ready'
  | 'invalid'
  | 'not-found'
  | 'forbidden'
  | 'error';

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

  protected readonly contextMatchesDocument = computed(() => {
    const document = this.document();
    const selectedPatient = this.selectedPatientState.selectedPatient();

    return (
      document !== null &&
      selectedPatient !== null &&
      document.patientRecordId === selectedPatient.patientRecordId
    );
  });

  protected readonly form = this.formBuilder.group({
    approvedDeidentifiedText: this.formBuilder.nonNullable.control('', [
      Validators.required,
    ]),
    externalTransmissionApproved: this.formBuilder.nonNullable.control(
      false,
      Validators.requiredTrue,
    ),
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

    const document = this.document();

    if (
      document === null ||
      this.status() !== 'ready' ||
      !this.contextMatchesDocument()
    ) {
      return;
    }

    const selectedPatient = this.selectedPatientState.selectedPatient();

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

    const approvedText =
      this.form.controls.approvedDeidentifiedText.value;

    if (approvedText.trim().length === 0) {
      this.form.controls.approvedDeidentifiedText.setErrors({
        required: true,
      });

      this.form.controls.approvedDeidentifiedText.markAsTouched();
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.documentApi
      .summariseDocument(document.id, {
        approvedDeidentifiedText: approvedText,
      })
      .pipe(
        finalize(() => {
          this.isSubmitting.set(false);
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
          this.handleSubmissionError(error);
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
            document.patientRecordId !==
            selectedPatient.patientRecordId
          ) {
            this.status.set('invalid');
            this.errorMessage.set(
              'This document does not belong to the currently selected patient.',
            );

            return EMPTY;
          }

          if (
            document.documentType !==
            'CONSULTATION_OUTCOME_LETTER' ||
            document.status !==
            'READY_FOR_DEIDENTIFICATION_REVIEW'
          ) {
            this.status.set('invalid');
            this.errorMessage.set(
              'This document is not awaiting de-identification review.',
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
            processing.machineDeidentifiedText === null
          ) {
            this.status.set('error');
            this.errorMessage.set(
              'The processing result does not contain de-identified text.',
            );

            return;
          }

          this.processing.set(processing);

          this.form.reset({
            approvedDeidentifiedText:
            processing.machineDeidentifiedText,
            externalTransmissionApproved: false,
          });

          this.status.set('ready');
        },
        error: (error: unknown) => {
          this.handleLoadError(error);
        },
      });
  }

  private handleLoadError(error: unknown): void {
    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.status.set('forbidden');
      this.refreshPatientContext();
      return;
    }

    this.status.set('error');

    this.errorMessage.set(
      getHttpErrorMessage(
        error,
        'Unable to load the de-identification review.',
      ),
    );
  }

  private handleSubmissionError(error: unknown): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 400)) {
      this.actionError.set(
        getHttpErrorMessage(
          error,
          'The approved de-identified text is invalid.',
        ),
      );

      return;
    }

    if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      this.status.set('forbidden');
      this.refreshPatientContext();
      return;
    }

    if (hasHttpStatus(error, 409)) {
      this.status.set('invalid');
      this.errorMessage.set(
        'The document state changed before summarisation could start. Return to document details to reload its current state.',
      );

      return;
    }

    if (hasHttpStatus(error, 413)) {
      this.status.set('invalid');
      this.errorMessage.set(
        'The approved de-identified text exceeded the summarisation limit. Return to document details to reload the current document state.',
      );

      return;
    }

    if (hasHttpStatus(error, 502)) {
      this.status.set('invalid');
      this.errorMessage.set(
        'The external summarisation service returned an invalid response. Return to document details to review the current document state.',
      );

      return;
    }

    if (hasHttpStatus(error, 503)) {
      this.status.set('invalid');
      this.errorMessage.set(
        'External summarisation is currently unavailable. Return to document details to review the current document state.',
      );

      return;
    }

    if (hasHttpStatus(error, 504)) {
      this.status.set('invalid');
      this.errorMessage.set(
        'External summarisation timed out. Return to document details to review the current document state.',
      );

      return;
    }

    this.status.set('invalid');
    this.errorMessage.set(
      'Summarisation did not complete. Return to document details before trying another action.',
    );
  }

  private refreshPatientContext(): void {
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
        }
      },
      error: (error: unknown) => {
        this.status.set('error');

        this.errorMessage.set(
          getHttpErrorMessage(
            error,
            'Unable to refresh your patient access.',
          ),
        );
      },
    });
  }
}
