import {DatePipe} from '@angular/common';
import {Component, computed, effect, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {MedicationResponse} from '../../models/medication-model';
import {MedicationApiService} from '../../services/medication-api-service';

type MedicationDetailsStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

/**
 * Displays the details of a medication for the selected patient.
 */
@Component({
  selector: 'app-medication-details',
  imports: [DatePipe, RouterLink],
  templateUrl: './medication-details.html',
})
export class MedicationDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly medicationApi = inject(MedicationApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly medication = signal<MedicationResponse | null>(null);
  protected readonly status = signal<MedicationDetailsStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isArchiving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'medication', 'edit'));

  /**
   * Returns to the medication list if the loaded medication no longer matches the selected patient.
   */
  constructor() {
    effect(() => {
      const medication = this.medication();
      const selectedPatient = this.selectedPatient();

      if (medication !== null && (selectedPatient === null || medication.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/medications']);
      }
    });
  }

  /**
   * Loads the medication from the id in the current route.
   */
  ngOnInit(): void {
    const medicationId = this.route.snapshot.paramMap.get('medicationId');

    if (medicationId === null || medicationId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadMedication(medicationId);
  }

  /**
   * Reloads the current medication.
   */
  protected retry(): void {
    const medicationId = this.route.snapshot.paramMap.get('medicationId');

    if (medicationId !== null) {
      this.loadMedication(medicationId);
    }
  }

  /**
   * Confirms and archives the current medication.
   */
  protected archive(): void {
    const medication = this.medication();
    this.actionError.set('');

    if (medication === null || !this.canEdit() || this.status() !== 'ready') {
      return;
    }

    if (!window.confirm('Archive this medication? It will no longer appear in the medication list.')) {
      return;
    }

    this.isArchiving.set(true);

    this.medicationApi.archiveMedication(medication.id).pipe(
      finalize(() => this.isArchiving.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/medications']),
      error: (error: unknown) => this.handleArchiveError(error, medication),
    });
  }

  /**
   * Loads the medication and checks that it belongs to the selected patient.
   */
  private loadMedication(medicationId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set('');
    this.medication.set(null);

    this.medicationApi.getMedication(medicationId).subscribe({
      next: (medication) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || medication.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This medication is not available for the selected patient.');
          return;
        }

        this.medication.set(medication);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  /**
   * Handles medication loading errors and refreshes patient access when needed.
   */
  private handleLoadError(error: unknown, failedPatientRecordId: string | null): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(failedPatientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the medication.'));
  }

  /**
   * Handles medication archive errors and refreshes patient access when needed.
   */
  private handleArchiveError(error: unknown, medication: MedicationResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(medication.patientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to archive the medication.'));
  }

  /**
   * Refreshes patient access and returns to the medication list if the selected patient has changed.
   */
  private recoverPatientAccess(failedPatientRecordId: string | null): void {
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/medications']);
          return;
        }

        this.status.set('forbidden');
      },
      error: (refreshError: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.'));
      },
    });
  }
}
