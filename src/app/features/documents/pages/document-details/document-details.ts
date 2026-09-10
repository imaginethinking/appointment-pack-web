import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, of, Subscription, switchMap } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatFileSize } from '../../../../shared/utils/formatting';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import {
  canArchiveDocument,
  canExtractDocument,
  documentHasProcessingResult,
  DocumentProcessingResultResponse,
  DocumentResponse,
  getDocumentStatusLabel,
  getDocumentTypeLabel,
  getSummarySourceLabel,
} from '../../models/document-model';
import { DocumentApiService } from '../../services/document-api-service';

type DocumentDetailsStatus = 'loading' | 'ready' | 'not-found' | 'forbidden' | 'error';

/**
 * Shows a document together with its current processing and review state.
 */
@Component({
  selector: 'app-document-details',
  imports: [DatePipe, RouterLink],
  templateUrl: './document-details.html',
})
export class DocumentDetails implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documentApi = inject(DocumentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private routeSubscription: Subscription | null = null;

  protected readonly document = signal<DocumentResponse | null>(null);
  protected readonly processing = signal<DocumentProcessingResultResponse | null>(null);
  protected readonly status = signal<DocumentDetailsStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isExtracting = signal(false);
  protected readonly isArchiving = signal(false);
  protected readonly isDownloading = signal(false);

  protected readonly contextMatchesDocument = computed(() => {
    const document = this.document();
    const selectedPatient = this.selectedPatientState.selectedPatient();
    return document !== null && selectedPatient !== null && document.patientRecordId === selectedPatient.patientRecordId;
  });

  protected readonly canViewDocument = computed(() => {
    if (!this.contextMatchesDocument()) {
      return false;
    }
    return this.authorisation.can(this.selectedPatientState.selectedPatient(), 'document', 'view');
  });

  protected readonly canEditDocument = computed(() => {
    if (!this.contextMatchesDocument()) {
      return false;
    }
    return this.authorisation.can(this.selectedPatientState.selectedPatient(), 'document', 'edit');
  });

  protected readonly canExtract = computed(() => {
    const document = this.document();
    return document !== null && this.canEditDocument() && canExtractDocument(document.status);
  });

  protected readonly canArchive = computed(() => {
    const document = this.document();
    return document !== null && this.canEditDocument() && canArchiveDocument(document.status);
  });

  protected readonly canOpenSummaryReview = computed(() => {
    const document = this.document();
    return document !== null
      && document.documentType === 'CONSULTATION_OUTCOME_LETTER'
      && (document.status === 'READY_FOR_SUMMARY_REVIEW' || document.status === 'SUMMARISATION_FAILED')
      && this.canEditDocument();
  });

  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly getDocumentStatusLabel = getDocumentStatusLabel;
  protected readonly getSummarySourceLabel = getSummarySourceLabel;
  protected readonly formatFileSize = formatFileSize;

  /**
   * Loads the document whenever the document id in the route changes.
   */
  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const documentId = params.get('documentId');
      if (documentId === null || documentId.length === 0) {
        this.status.set('not-found');
        return;
      }
      this.loadDocument(documentId);
    });
  }

  /**
   * Stops listening for route changes when the page is destroyed.
   */
  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  /**
   * Reloads the current document after a failed request.
   */
  protected retryLoad(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');
    if (documentId === null) {
      return;
    }
    this.actionError.set('');
    this.loadDocument(documentId);
  }

  /**
   * Processes the current document and updates the page with its new state.
   */
  protected extract(): void {
    this.actionError.set('');
    const document = this.document();

    if (document === null || !this.canExtract()) {
      return;
    }

    this.isExtracting.set(true);
    this.documentApi.extractDocument(document.id).subscribe({
      next: (processing) => {
        this.processing.set(processing);
        this.document.update((currentDocument) => currentDocument === null ? null : { ...currentDocument, status: processing.status });
        this.isExtracting.set(false);
      },
      error: (error: unknown) => {
        this.isExtracting.set(false);
        this.handleExtractionError(error, document);
      },
    });
  }

  /**
   * Confirms the action before archiving the current document.
   */
  protected archive(): void {
    this.actionError.set('');
    const document = this.document();

    if (document === null || !this.canArchive()) {
      return;
    }

    if (!window.confirm('Archive this document? It will no longer appear in the document list.')) {
      return;
    }

    this.isArchiving.set(true);
    this.documentApi.archiveDocument(document.id).subscribe({
      next: () => {
        this.isArchiving.set(false);
        void this.router.navigate(['/documents']);
      },
      error: (error: unknown) => {
        this.isArchiving.set(false);

        if (hasHttpStatus(error, 403)) {
          this.recoverPatientAccess(document.patientRecordId, 'forbidden');
          return;
        }

        if (hasHttpStatus(error, 404)) {
          this.recoverPatientAccess(document.patientRecordId, 'not-found');
          return;
        }

        if (hasHttpStatus(error, 409)) {
          this.actionError.set('This document was updated while you were working. The latest version has been loaded.');
          this.loadDocument(document.id, true);
          return;
        }

        this.actionError.set(getHttpErrorMessage(error, 'Unable to archive the document.'));
      },
    });
  }

  /**
   * Downloads the original file using a temporary browser URL.
   */
  protected download(): void {
    this.actionError.set('');
    const document = this.document();

    if (document === null || !this.canViewDocument()) {
      return;
    }

    this.isDownloading.set(true);
    this.documentApi.downloadDocument(document.id).subscribe({
      next: (response) => {
        this.isDownloading.set(false);

        if (response.body === null) {
          this.actionError.set('The downloaded file was empty.');
          return;
        }

        // Create a temporary URL for the downloaded file and release it once the download has started.
        const url = URL.createObjectURL(response.body);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = document.originalFileName;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => {
        this.isDownloading.set(false);

        if (hasHttpStatus(error, 403)) {
          this.recoverPatientAccess(document.patientRecordId, 'forbidden');
          return;
        }

        if (hasHttpStatus(error, 404)) {
          this.recoverPatientAccess(document.patientRecordId, 'not-found');
          return;
        }

        this.actionError.set(getHttpErrorMessage(error, 'Unable to download the document.'));
      },
    });
  }

  /**
   * Returns the message shown for the current stage of the document workflow.
   */
  protected workflowMessage(): string {
    const document = this.document();

    if (document === null) {
      return '';
    }

    switch (document.status) {
      case 'UPLOADED':
        return 'This document is ready to be processed.';
      case 'EXTRACTING':
        return 'This document is being processed.';
      case 'READY_FOR_APPOINTMENT_REVIEW':
        return 'The appointment details are ready to review.';
      case 'READY_FOR_DEIDENTIFICATION_REVIEW':
        return 'The consultation text is ready for privacy review.';
      case 'SUMMARISING':
        return 'A consultation summary is being prepared.';
      case 'READY_FOR_SUMMARY_REVIEW':
        return 'The consultation summary is ready to review.';
      case 'EXTRACTION_FAILED':
        return 'The document could not be processed. You can try again without uploading it again.';
      case 'SUMMARISATION_FAILED':
        return 'The consultation summary could not be generated. You can try again or enter it manually.';
      case 'ACCEPTED':
        return document.documentType === 'APPOINTMENT_LETTER'
          ? 'The appointment details from this document have been confirmed.'
          : 'The consultation summary has been added to medical history.';
      case 'REJECTED':
        return document.documentType === 'APPOINTMENT_LETTER'
          ? 'The appointment details from this document were not added.'
          : 'The consultation summary was not added to medical history.';
      case 'ARCHIVED':
        return 'This document has been archived.';
    }
  }

  /**
   * Loads the document and includes its processing information when it is available for the selected patient.
   */
  private loadDocument(documentId: string, preserveActionError = false): void {
    const failedPatientRecordId = this.selectedPatientState.selectedPatient()?.patientRecordId ?? null;
    this.status.set('loading');
    this.errorMessage.set('');
    if (!preserveActionError) {
      this.actionError.set('');
    }
    this.document.set(null);
    this.processing.set(null);

    this.documentApi.getDocument(documentId).pipe(
      switchMap((document) => {
        this.document.set(document);
        const selectedPatient = this.selectedPatientState.selectedPatient();

        if (selectedPatient === null || document.patientRecordId !== selectedPatient.patientRecordId) {
          return of({ document, processing: null });
        }

        if (!this.authorisation.can(selectedPatient, 'document', 'view') || !documentHasProcessingResult(document.status)) {
          return of({ document, processing: null });
        }

        return this.documentApi.getDocumentProcessing(document.id).pipe(map((processing) => ({ document, processing })));
      }),
    ).subscribe({
      next: ({ processing }) => {
        this.processing.set(processing);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  /**
   * Handles processing failures and reloads the document so the page shows its latest state.
   */
  private handleExtractionError(error: unknown, document: DocumentResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(document.patientRecordId, 'forbidden');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.recoverPatientAccess(document.patientRecordId, 'not-found');
      return;
    }

    if (hasHttpStatus(error, 409)) {
      this.actionError.set('This document was updated while you were working. The latest version has been loaded.');
    } else if (hasHttpStatus(error, 413)) {
      this.actionError.set('The document is too large to process.');
    } else if (hasHttpStatus(error, 415)) {
      this.actionError.set('The document format is not supported.');
    } else if (hasHttpStatus(error, 422)) {
      this.actionError.set('Text could not be extracted from the document.');
    } else if (hasHttpStatus(error, 502)) {
      this.actionError.set('The document could not be processed. Please try again.');
    } else if (hasHttpStatus(error, 503)) {
      this.actionError.set('Document processing is temporarily unavailable. Please try again later.');
    } else if (hasHttpStatus(error, 504)) {
      this.actionError.set('Document processing took too long. Please try again.');
    } else {
      this.actionError.set(getHttpErrorMessage(error, 'Unable to process the document.'));
    }

    this.loadDocument(document.id, true);
  }

  /**
   * Handles errors while loading the document and refreshes patient access when needed.
   */
  private handleLoadError(error: unknown, failedPatientRecordId: string | null): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(failedPatientRecordId, 'forbidden');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.recoverPatientAccess(failedPatientRecordId, 'not-found');
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the document.'));
  }

  /**
   * Refreshes patient access and updates the page if the selected patient is no longer available.
   */
  private recoverPatientAccess(failedPatientRecordId: string | null, fallbackStatus: 'forbidden' | 'not-found'): void {
    this.status.set('loading');
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatientState.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/documents']);
          return;
        }

        this.status.set(fallbackStatus);
      },
      error: (error: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to refresh your access.'));
      },
    });
  }
}
