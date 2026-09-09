import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { getDocumentTypeLabel } from '../../../documents/models/document-model';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { getMedicalHistorySourceLabel, MedicalHistoryEntryResponse } from '../../models/medical-history-model';
import { MedicalHistoryApiService } from '../../services/medical-history-api-service';

type MedicalHistoryDetailsStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

/**
 * Displays a Medical History entry together with its source information when available.
 */
@Component({
  selector: 'app-medical-history-details',
  imports: [DatePipe, RouterLink],
  templateUrl: './medical-history-details.html',
})
export class MedicalHistoryDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly medicalHistoryApi = inject(MedicalHistoryApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly entry = signal<MedicalHistoryEntryResponse | null>(null);
  protected readonly status = signal<MedicalHistoryDetailsStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isArchiving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'history', 'edit'));
  protected readonly getMedicalHistorySourceLabel = getMedicalHistorySourceLabel;
  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;

  /**
   * Returns to Medical History when the loaded entry no longer matches the selected patient.
   */
  constructor() {
    effect(() => {
      const entry = this.entry();
      const selectedPatient = this.selectedPatient();

      if (entry !== null && (selectedPatient === null || entry.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/medical-history']);
      }
    });
  }

  /**
   * Loads the Medical History entry identified by the route.
   */
  ngOnInit(): void {
    const entryId = this.route.snapshot.paramMap.get('entryId');

    if (entryId === null || entryId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadEntry(entryId);
  }

  /**
   * Tries to load the entry again.
   */
  protected retry(): void {
    const entryId = this.route.snapshot.paramMap.get('entryId');

    if (entryId !== null) {
      this.loadEntry(entryId);
    }
  }

  /**
   * Confirms the action before archiving the Medical History entry.
   */
  protected archive(): void {
    const entry = this.entry();
    this.actionError.set('');

    if (entry === null || !this.canEdit() || this.status() !== 'ready') {
      return;
    }

    if (!window.confirm('Archive this medical history entry? It will no longer appear in medical history.')) {
      return;
    }

    this.isArchiving.set(true);

    this.medicalHistoryApi.archiveMedicalHistoryEntry(entry.id).pipe(
      finalize(() => this.isArchiving.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/medical-history']),
      error: (error: unknown) => this.handleArchiveError(error, entry),
    });
  }

  /**
   * Loads the entry and checks that it belongs to the selected patient.
   */
  private loadEntry(entryId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set('');
    this.entry.set(null);

    this.medicalHistoryApi.getMedicalHistoryEntry(entryId).subscribe({
      next: (entry) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || entry.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This medical history entry is not available for the selected patient.');
          return;
        }

        this.entry.set(entry);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  /**
   * Handles errors that occur while loading the Medical History entry.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the medical history entry.'));
  }

  /**
   * Handles errors that occur while archiving the entry.
   */
  private handleArchiveError(error: unknown, entry: MedicalHistoryEntryResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(entry.patientRecordId, 'forbidden');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.recoverPatientAccess(entry.patientRecordId, 'not-found');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to archive the medical history entry.'));
  }

  /**
   * Refreshes patient access and keeps the page in the correct state after an access change.
   */
  private recoverPatientAccess(failedPatientRecordId: string | null, fallbackStatus: 'forbidden' | 'not-found'): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/medical-history']);
          return;
        }

        this.status.set(fallbackStatus);
      },
      error: (refreshError: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.'));
      },
    });
  }
}
