import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatFileSize } from '../../../../shared/utils/formatting';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { DocumentResponse, getDocumentStatusLabel, getDocumentTypeLabel } from '../../models/document-model';
import { DocumentApiService } from '../../services/document-api-service';

type DocumentListPageStatus = 'loading' | 'ready' | 'no-selection' | 'forbidden' | 'not-found' | 'error';

@Component({
  selector: 'app-document-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './document-list.html',
})
export class DocumentList {
  private readonly documentApi = inject(DocumentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly reloadVersion = signal(0);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly documents = signal<readonly DocumentResponse[]>([]);
  protected readonly status = signal<DocumentListPageStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly canUploadDocuments = computed(() => this.authorisation.can(this.selectedPatient(), 'document', 'upload'));
  protected readonly getDocumentStatusLabel = getDocumentStatusLabel;
  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly formatFileSize = formatFileSize;

  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const selectedPatient = this.selectedPatient();

      this.documents.set([]);
      this.errorMessage.set('');

      if (selectedPatient === null) {
        this.status.set('no-selection');
        return;
      }

      if (!this.authorisation.can(selectedPatient, 'document', 'view')) {
        this.status.set('forbidden');
        return;
      }

      const patientRecordId = selectedPatient.patientRecordId;
      this.status.set('loading');

      const subscription = this.documentApi.getDocuments(patientRecordId).subscribe({
        next: (documents) => {
          this.documents.set(documents);
          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error, patientRecordId),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  protected selectedPatientName(): string {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  }

  private handleLoadError(error: unknown, failedPatientRecordId: string): void {
    this.documents.set([]);

    if (!hasHttpStatus(error, 403) && !hasHttpStatus(error, 404)) {
      this.status.set('error');
      this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load documents for the selected patient.'));
      return;
    }

    const recordNotFound = hasHttpStatus(error, 404);
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null) {
          this.status.set('no-selection');
          return;
        }

        if (selectedPatient.patientRecordId !== failedPatientRecordId) {
          return;
        }

        if (!this.authorisation.can(selectedPatient, 'document', 'view')) {
          this.status.set('forbidden');
          return;
        }

        this.status.set(recordNotFound ? 'not-found' : 'forbidden');
      },
      error: (refreshError: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh your patient access.'));
      },
    });
  }
}
