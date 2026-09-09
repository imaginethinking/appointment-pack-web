import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { MedicationResponse } from '../../models/medication-model';
import { MedicationApiService } from '../../services/medication-api-service';

type MedicationListStatus = 'loading' | 'ready' | 'no-patient' | 'forbidden' | 'error';

/**
 * Displays the medications for the selected patient.
 */
@Component({
  selector: 'app-medication-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './medication-list.html',
})
export class MedicationList {
  private readonly medicationApi = inject(MedicationApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly reloadVersion = signal(0);

  protected readonly medications = signal<readonly MedicationResponse[]>([]);
  protected readonly status = signal<MedicationListStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEditMedications = computed(() => this.authorisation.can(this.selectedPatient(), 'medication', 'edit'));
  protected readonly getPatientContextName = getPatientContextName;

  /**
   * Loads medications whenever the selected patient changes or the page is retried.
   */
  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const selectedPatient = this.selectedPatient();

      this.medications.set([]);
      this.errorMessage.set('');

      if (selectedPatient === null) {
        this.status.set('no-patient');
        return;
      }

      if (!this.authorisation.can(selectedPatient, 'medication', 'view')) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = this.medicationApi.getMedications(selectedPatient.patientRecordId).subscribe({
        next: (medications) => {
          this.medications.set(medications);
          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Reloads the medication list.
   */
  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  /**
   * Handles medication loading errors and refreshes patient access when needed.
   */
  private handleLoadError(error: unknown): void {
    if (hasHttpStatus(error, 403)) {
      this.status.set('forbidden');
      this.refreshPatientAccess();
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('error');
      this.errorMessage.set('The selected patient record is no longer available.');
      this.refreshPatientAccess();
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load medications.'));
  }

  /**
   * Refreshes the available patient access after the current selection fails.
   */
  private refreshPatientAccess(): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      error: (error: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to refresh patient access.'));
      },
    });
  }
}
