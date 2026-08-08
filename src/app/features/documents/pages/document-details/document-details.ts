import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  finalize,
  map,
  of,
  Subscription,
  switchMap,
} from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
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

type DocumentDetailsStatus =
  | 'loading'
  | 'ready'
  | 'not-found'
  | 'forbidden'
  | 'error';

interface DocumentDetailsResult {
  document: DocumentResponse;
  processing: DocumentProcessingResultResponse | null;
}

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

  private loadSubscription: Subscription | null = null;

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;

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
    const selectedPatient = this.selectedPatient();

    return (
      document !== null &&
      selectedPatient !== null &&
      document.patientRecordId === selectedPatient.patientRecordId
    );
  });

  protected readonly canViewDocument = computed(() =>
    this.authorisation.can(
      this.selectedPatient(),
      'document',
      'view',
    ),
  );

  protected readonly canEditDocument = computed(() =>
    this.authorisation.can(
      this.selectedPatient(),
      'document',
      'edit',
    ),
  );

  protected readonly canExtract = computed(() => {
    const document = this.document();

    return (
      document !== null &&
      this.contextMatchesDocument() &&
      this.canEditDocument() &&
      canExtractDocument(document.status)
    );
  });

  protected readonly canArchive = computed(() => {
    const document = this.document();

    return (
      document !== null &&
      this.contextMatchesDocument() &&
      this.canEditDocument() &&
      canArchiveDocument(document.status)
    );
  });

  protected readonly getDocumentStatusLabel = getDocumentStatusLabel;

  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;

  protected readonly getSummarySourceLabel = getSummarySourceLabel;

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
    this.loadSubscription?.unsubscribe();
  }

  protected retryLoad(): void {
    const documentId = this.route.snapshot.paramMap.get('documentId');

    if (documentId !== null) {
      this.loadDocument(documentId);
    }
  }

  protected extract(): void {
    const document = this.document();

    if (document === null || !this.canExtract()) {
      return;
    }

    this.actionError.set('');
    this.isExtracting.set(true);

    this.documentApi
      .extractDocument(document.id)
      .pipe(
        finalize(() => {
          this.isExtracting.set(false);
        }),
      )
      .subscribe({
        next: (processing) => {
          this.processing.set(processing);

          this.document.update((current) =>
            current === null
              ? null
              : {
                ...current,
                status: processing.status,
              },
          );
        },
        error: (error: unknown) => {
          this.handleExtractionError(error);
        },
      });
  }

  protected archive(): void {
    const document = this.document();

    if (document === null || !this.canArchive()) {
      return;
    }

    const confirmed = window.confirm(
      `Archive ${document.originalFileName}?`,
    );

    if (!confirmed) {
      return;
    }

    this.actionError.set('');
    this.isArchiving.set(true);

    this.documentApi
      .archiveDocument(document.id)
      .pipe(
        finalize(() => {
          this.isArchiving.set(false);
        }),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/documents']);
        },
        error: (error: unknown) => {
          if (hasHttpStatus(error, 409)) {
            this.actionError.set(
              'The document state has changed and it can no longer be archived.',
            );

            this.loadDocument(document.id);
            return;
          }

          if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
            this.refreshPatientContextAfterStaleAccess();
            return;
          }

          this.actionError.set(
            getHttpErrorMessage(
              error,
              'Unable to archive the document.',
            ),
          );
        },
      });
  }

  protected download(): void {
    const document = this.document();

    if (
      document === null ||
      !this.contextMatchesDocument() ||
      !this.canViewDocument()
    ) {
      return;
    }

    this.actionError.set('');
    this.isDownloading.set(true);

    this.documentApi
      .downloadDocument(document.id)
      .pipe(
        finalize(() => {
          this.isDownloading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const blob = response.body;

          if (blob === null) {
            this.actionError.set(
              'The document file could not be downloaded.',
            );
            return;
          }

          const objectUrl = URL.createObjectURL(blob);

          const link = window.document.createElement('a');
          link.href = objectUrl;
          link.download = document.originalFileName;

          window.document.body.appendChild(link);
          link.click();
          link.remove();

          URL.revokeObjectURL(objectUrl);
        },
        error: (error: unknown) => {
          if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
            this.refreshPatientContextAfterStaleAccess();
            return;
          }

          this.actionError.set(
            getHttpErrorMessage(
              error,
              'Unable to download the document.',
            ),
          );
        },
      });
  }

  protected workflowMessage(): string {
    const document = this.document();

    if (document === null) {
      return '';
    }

    return switchStatus(document.status);
  }

  protected formatFileSize(fileSize: number): string {
    if (fileSize < 1024) {
      return `${fileSize} B`;
    }

    if (fileSize < 1024 * 1024) {
      return `${(fileSize / 1024).toFixed(1)} KB`;
    }

    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`;
  }

  private loadDocument(documentId: string): void {
    this.loadSubscription?.unsubscribe();

    this.status.set('loading');
    this.errorMessage.set('');
    this.document.set(null);
    this.processing.set(null);

    this.loadSubscription = this.documentApi
      .getDocument(documentId)
      .pipe(
        switchMap((document) => {
          if (!documentHasProcessingResult(document.status)) {
            return of<DocumentDetailsResult>({
              document,
              processing: null,
            });
          }

          return this.documentApi
            .getDocumentProcessing(document.id)
            .pipe(
              map((processing) => ({
                document,
                processing,
              })),
            );
        }),
      )
      .subscribe({
        next: (result) => {
          this.document.set(result.document);
          this.processing.set(result.processing);
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
      this.refreshPatientContextAfterStaleAccess();
      return;
    }

    this.status.set('error');

    this.errorMessage.set(
      getHttpErrorMessage(
        error,
        'Unable to load the document.',
      ),
    );
  }

  private handleExtractionError(error: unknown): void {
    const document = this.document();

    if (hasHttpStatus(error, 409)) {
      this.actionError.set(
        'The document state changed before processing could start.',
      );

      if (document !== null) {
        this.loadDocument(document.id);
      }

      return;
    }

    if (hasHttpStatus(error, 413)) {
      this.actionError.set(
        'The document exceeds the processing size limit.',
      );
      return;
    }

    if (hasHttpStatus(error, 415)) {
      this.actionError.set(
        'The processing service does not support this document type.',
      );
      return;
    }

    if (hasHttpStatus(error, 422)) {
      this.actionError.set(
        'Text could not be extracted from this document.',
      );
      return;
    }

    if (hasHttpStatus(error, 502)) {
      this.actionError.set(
        'The document processor returned an invalid response.',
      );
      return;
    }

    if (hasHttpStatus(error, 503)) {
      this.actionError.set(
        'Document processing is currently unavailable.',
      );
      return;
    }

    if (hasHttpStatus(error, 504)) {
      this.actionError.set(
        'Document processing timed out. You can retry extraction.',
      );
      return;
    }

    if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      this.refreshPatientContextAfterStaleAccess();
      return;
    }

    this.actionError.set(
      getHttpErrorMessage(
        error,
        'Unable to process the document.',
      ),
    );
  }

  private refreshPatientContextAfterStaleAccess(): void {
    this.patientContextCoordinator.load().subscribe({
      next: () => {
        if (!this.canViewDocument()) {
          this.status.set('forbidden');
          return;
        }

        this.actionError.set(
          'Your patient access changed. Reload the document before continuing.',
        );
      },
      error: (error: unknown) => {
        this.actionError.set(
          getHttpErrorMessage(
            error,
            'Unable to refresh your patient access.',
          ),
        );
      },
    });
  }
}

function switchStatus(status: DocumentResponse['status']): string {
  switch (status) {
    case 'UPLOADED':
      return 'The document has been uploaded. Processing has not started.';

    case 'EXTRACTING':
      return 'Text extraction is currently in progress.';

    case 'READY_FOR_DEIDENTIFICATION_REVIEW':
      return 'Local de-identification is ready for human review before any external AI transmission.';

    case 'SUMMARISING':
      return 'The approved de-identified text is being summarised.';

    case 'READY_FOR_SUMMARY_REVIEW':
      return 'The generated summary is ready for human review.';

    case 'EXTRACTION_FAILED':
      return 'Text extraction was unsuccessful. The original upload is retained and extraction can be retried.';

    case 'SUMMARISATION_FAILED':
      return 'External summarisation was unsuccessful. The approved de-identified text is retained for retry or manual summarisation.';

    case 'ACCEPTED':
      return 'The reviewed summary has been accepted into medical history.';

    case 'REJECTED':
      return 'The generated summary was rejected and no medical-history entry was created.';

    case 'ARCHIVED':
      return 'The document is archived.';
  }
}
