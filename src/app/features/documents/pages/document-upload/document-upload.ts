import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatFileSize } from '../../../../shared/utils/formatting';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { DOCUMENT_MAXIMUM_FILE_SIZE_BYTES } from '../../models/document-constraints';
import { DOCUMENT_TYPES, DocumentType, getDocumentTypeLabel } from '../../models/document-model';
import { DocumentApiService } from '../../services/document-api-service';

/**
 * Uploads appointment and consultation documents for the selected patient.
 */
@Component({
  selector: 'app-document-upload',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './document-upload.html',
})
export class DocumentUpload {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly documentApi = inject(DocumentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly fileError = signal('');
  protected readonly errorMessage = signal('');
  protected readonly isUploading = signal(false);
  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly formatFileSize = formatFileSize;

  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });

  protected readonly canUpload = computed(() => this.authorisation.can(this.selectedPatient(), 'document', 'upload'));

  protected readonly form = this.formBuilder.group({
    documentType: this.formBuilder.nonNullable.control<DocumentType | ''>('', Validators.required),
  });

  /**
   * Clears the current upload when the selected patient changes.
   */
  constructor() {
    effect(() => {
      this.selectedPatient()?.patientRecordId;
      this.resetUploadSelection();
    });
  }

  /**
   * Reads the selected file and checks its size before keeping it for upload.
   */
  protected selectFile(event: Event): void {
    this.fileError.set('');
    this.errorMessage.set('');

    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;

    if (file === null) {
      this.selectedFile.set(null);
      return;
    }

    const validationMessage = this.validateFile(file);

    if (validationMessage !== null) {
      this.selectedFile.set(null);
      this.fileError.set(validationMessage);
      input.value = '';
      return;
    }

    this.selectedFile.set(file);
  }

  /**
   * Uploads the selected document and opens it when the same patient is still selected.
   */
  protected upload(): void {
    this.errorMessage.set('');
    this.fileError.set('');

    const selectedPatient = this.selectedPatient();
    const file = this.selectedFile();

    if (selectedPatient === null || !this.canUpload()) {
      this.errorMessage.set('Your current access does not allow document uploads.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (file === null) {
      this.fileError.set('Select a document to upload.');
      return;
    }

    const documentType = this.form.controls.documentType.value;

    if (documentType === '') {
      return;
    }

    const patientRecordId = selectedPatient.patientRecordId;
    this.isUploading.set(true);

    this.documentApi.uploadDocument(patientRecordId, documentType, file).pipe(
      finalize(() => this.isUploading.set(false)),
    ).subscribe({
      next: (document) => {
        if (this.selectedPatient()?.patientRecordId !== document.patientRecordId) {
          this.errorMessage.set('The document was uploaded successfully, but the selected patient changed during the upload.');
          return;
        }

        void this.router.navigate(['/documents', document.id]);
      },
      error: (error: unknown) => this.handleUploadError(error, patientRecordId),
    });
  }

  /**
   * Checks that the selected file is not empty or larger than the allowed upload size.
   */
  private validateFile(file: File): string | null {
    if (file.size === 0) {
      return 'The selected file is empty.';
    }

    if (file.size > DOCUMENT_MAXIMUM_FILE_SIZE_BYTES) {
      return 'The selected file exceeds the 10 MB maximum size.';
    }

    return null;
  }

  /**
   * Shows a suitable message for upload failures and refreshes patient access when required.
   */
  private handleUploadError(error: unknown, failedPatientRecordId: string): void {
    if (hasHttpStatus(error, 413)) {
      this.errorMessage.set('The selected document exceeds the maximum upload size.');
      return;
    }

    if (hasHttpStatus(error, 415)) {
      this.errorMessage.set('This file type is not supported. Upload a PDF, JPEG or PNG file.');
      return;
    }

    if (hasHttpStatus(error, 422)) {
      this.errorMessage.set('The document could not be read. Check the file and try again.');
      return;
    }

    if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      this.refreshPatientAccess(failedPatientRecordId);
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to upload the document.'));
  }

  /**
   * Refreshes patient access after an upload fails and checks whether the same patient is still available.
   */
  private refreshPatientAccess(failedPatientRecordId: string): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient?.patientRecordId !== failedPatientRecordId) {
          this.errorMessage.set('Your access has changed. Select the patient again before uploading.');
          return;
        }

        if (!this.canUpload()) {
          this.errorMessage.set('Your current access does not allow document uploads.');
          return;
        }

        this.errorMessage.set('This patient record is no longer available.');
      },
      error: (refreshError: unknown) => this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh your patient access.')),
    });
  }

  /**
   * Clears the selected document type file and any previous upload errors.
   */
  private resetUploadSelection(): void {
    this.form.reset({ documentType: '' });
    this.selectedFile.set(null);
    this.fileError.set('');
    this.errorMessage.set('');
  }
}
