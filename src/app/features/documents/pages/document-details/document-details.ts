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

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  protected retryLoad(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');
    if (documentId === null) {
      return;
    }
    this.actionError.set('');
    this.loadDocument(documentId);
  }

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

  protected archive(): void {
    this.actionError.set('');
    const document = this.document();

    if (document === null || !this.canArchive()) {
      return;
    }

    if (!window.confirm('Archive this document? It will no longer appear in the normal document list.')) {
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
          this.actionError.set('The document state changed before it could be archived. The latest state has been reloaded.');
          this.loadDocument(document.id, true);
          return;
        }

        this.actionError.set(getHttpErrorMessage(error, 'Unable to archive the document.'));
      },
    });
  }

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

  protected workflowMessage(): string {
    const document = this.document();
    if (document === null) {
      return '';
    }

    switch (document.status) {
      case 'UPLOADED':
        return 'The document has been uploaded and is ready for processing.';
      case 'EXTRACTING':
        return 'Text is currently being extracted from the document.';
      case 'READY_FOR_APPOINTMENT_REVIEW':
        return 'Appointment details have been extracted and are ready for review.';
      case 'READY_FOR_DEIDENTIFICATION_REVIEW':
        return 'The consultation text has been de-identified locally and is ready for review.';
      case 'SUMMARISING':
        return 'The approved de-identified consultation text is being summarised.';
      case 'READY_FOR_SUMMARY_REVIEW':
        return 'The consultation summary is ready for review.';
      case 'EXTRACTION_FAILED':
        return 'Text extraction did not complete successfully. You can retry without uploading the document again.';
      case 'SUMMARISATION_FAILED':
        return 'External summarisation did not complete successfully. The approved de-identified text has been retained. You can retry summarisation or enter a manual summary.';
      case 'ACCEPTED':
        return document.documentType === 'APPOINTMENT_LETTER'
          ? 'The appointment has been confirmed from this document.'
          : 'The reviewed consultation summary has been accepted into medical history.';
      case 'REJECTED':
        return document.documentType === 'APPOINTMENT_LETTER'
          ? 'The extracted appointment details were rejected and no appointment was created.'
          : 'The consultation summary was rejected and no medical-history entry was created.';
      case 'ARCHIVED':
        return 'The document has been archived.';
    }
  }

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
      this.actionError.set('The document state changed before extraction could begin. The latest state has been reloaded.');
    } else if (hasHttpStatus(error, 413)) {
      this.actionError.set('The document is too large to process.');
    } else if (hasHttpStatus(error, 415)) {
      this.actionError.set('The document format is not supported.');
    } else if (hasHttpStatus(error, 422)) {
      this.actionError.set('Text could not be extracted from the document.');
    } else if (hasHttpStatus(error, 502)) {
      this.actionError.set('The document-processing service returned an invalid response.');
    } else if (hasHttpStatus(error, 503)) {
      this.actionError.set('Document processing is currently unavailable.');
    } else if (hasHttpStatus(error, 504)) {
      this.actionError.set('Document processing timed out.');
    } else {
      this.actionError.set(getHttpErrorMessage(error, 'Document processing failed.'));
    }

    this.loadDocument(document.id, true);
  }

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
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to refresh your patient access.'));
      },
    });
  }
}
