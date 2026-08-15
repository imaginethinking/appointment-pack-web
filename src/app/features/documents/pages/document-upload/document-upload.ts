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
import { DOCUMENT_TYPES, DocumentType, getDocumentTypeLabel } from '../../models/document-model';
import { DocumentApiService } from '../../services/document-api-service';

const MAXIMUM_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;

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
  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });
  protected readonly canUpload = computed(() => this.authorisation.can(this.selectedPatient(), 'document', 'upload'));
  protected readonly form = this.formBuilder.group({
    documentType: this.formBuilder.nonNullable.control<DocumentType | ''>('', Validators.required),
  });
  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly formatFileSize = formatFileSize;

  constructor() {
    effect(() => {
      this.selectedPatient()?.patientRecordId;
      this.resetUploadSelection();
    });
  }

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

  protected upload(): void {
    this.errorMessage.set('');

    const selectedPatient = this.selectedPatient();
    const file = this.selectedFile();

    if (selectedPatient === null || !this.authorisation.can(selectedPatient, 'document', 'upload')) {
      this.errorMessage.set('You do not have permission to upload documents for the selected patient.');
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
      error: (error: unknown) => this.handleUploadError(error),
    });
  }

  private validateFile(file: File): string | null {
    if (file.size === 0) {
      return 'The selected file is empty.';
    }

    if (file.size > MAXIMUM_DOCUMENT_FILE_SIZE_BYTES) {
      return 'The selected file exceeds the 10 MB maximum size.';
    }

    const lowerCaseName = file.name.toLowerCase();
    const supported = SUPPORTED_FILE_EXTENSIONS.some((extension) => lowerCaseName.endsWith(extension));

    return supported ? null : 'Select a PDF, JPEG or PNG document.';
  }

  private handleUploadError(error: unknown): void {
    if (hasHttpStatus(error, 413)) {
      this.errorMessage.set('The selected document exceeds the maximum upload size.');
      return;
    }

    if (hasHttpStatus(error, 415)) {
      this.errorMessage.set('Only PDF, JPEG and PNG documents are supported.');
      return;
    }

    if (hasHttpStatus(error, 422)) {
      this.errorMessage.set('The selected document could not be read.');
      return;
    }

    if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      this.refreshPatientContextAfterStaleAccess();
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to upload the document.'));
  }

  private refreshPatientContextAfterStaleAccess(): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null) {
          this.errorMessage.set('Your patient access has changed. Select a patient and try again.');
          return;
        }

        if (!this.canUpload()) {
          this.errorMessage.set('You no longer have permission to upload documents for this patient.');
          return;
        }

        this.errorMessage.set('The patient record is no longer available for this upload. Please try again.');
      },
      error: (refreshError: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh your patient access.'));
      },
    });
  }

  private resetUploadSelection(): void {
    this.form.reset({ documentType: '' });
    this.selectedFile.set(null);
    this.fileError.set('');
    this.errorMessage.set('');
  }
}
