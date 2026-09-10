import {DatePipe} from '@angular/common';
import {Component, computed, effect, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {getDocumentTypeLabel} from '../../../documents/models/document-model';
import {getPatientContextName} from '../../../patient-context/models/selected-patient-context';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {getMedicalHistorySourceLabel, MedicalHistoryEntryResponse} from '../../models/medical-history-model';
import {MedicalHistoryApiService} from '../../services/medical-history-api-service';

type MedicalHistoryStatus = 'loading' | 'ready' | 'no-patient' | 'forbidden' | 'error';

/**
 * Shows the Medical History recorded for the selected patient.
 */
@Component({
  selector: 'app-medical-history',
  imports: [DatePipe, RouterLink],
  templateUrl: './medical-history.html',
})
export class MedicalHistory {
  private readonly medicalHistoryApi = inject(MedicalHistoryApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly reloadVersion = signal(0);

  protected readonly entries = signal<readonly MedicalHistoryEntryResponse[]>([]);
  protected readonly status = signal<MedicalHistoryStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEditHistory = computed(() => this.authorisation.can(this.selectedPatient(), 'history', 'edit'));
  protected readonly getPatientContextName = getPatientContextName;
  protected readonly getMedicalHistorySourceLabel = getMedicalHistorySourceLabel;
  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;

  /**
   * Loads the Medical History again when the patient changes or the user retries the request.
   */
  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const selectedPatient = this.selectedPatient();

      this.entries.set([]);
      this.errorMessage.set('');

      if (selectedPatient === null) {
        this.status.set('no-patient');
        return;
      }

      if (!this.authorisation.can(selectedPatient, 'history', 'view')) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = this.medicalHistoryApi.getMedicalHistory(selectedPatient.patientRecordId).subscribe({
        next: (entries) => {
          this.entries.set(entries);
          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Reloads the Medical History after a failed request.
   */
  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  /**
   * Handles problems loading Medical History and checks for changes to patient access.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load medical history.'));
  }

  /**
   * Refreshes the patients currently available to the user.
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
