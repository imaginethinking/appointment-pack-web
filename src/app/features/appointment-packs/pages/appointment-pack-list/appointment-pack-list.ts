import {DatePipe} from '@angular/common';
import {Component, computed, effect, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {formatFileSize} from '../../../../shared/utils/formatting';
import {getPatientContextName} from '../../../patient-context/models/selected-patient-context';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {AppointmentPackResponse} from '../../models/appointment-pack-model';
import {AppointmentPackApiService} from '../../services/appointment-pack-api-service';

type AppointmentPackListStatus = 'loading' | 'ready' | 'no-patient' | 'forbidden' | 'error';

/**
 * Shows the Appointment Packs that have been generated for the selected patient.
 */
@Component({
  selector: 'app-appointment-pack-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './appointment-pack-list.html',
})
export class AppointmentPackList {
  private readonly appointmentPackApi = inject(AppointmentPackApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly reloadVersion = signal(0);

  protected readonly appointmentPacks = signal<readonly AppointmentPackResponse[]>([]);
  protected readonly status = signal<AppointmentPackListStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canGeneratePacks = computed(() => {
    const selectedPatient = this.selectedPatient();
    return this.authorisation.can(selectedPatient, 'appointment-pack', 'create') && this.authorisation.can(selectedPatient, 'appointment', 'view');
  });
  protected readonly getPatientContextName = getPatientContextName;
  protected readonly formatFileSize = formatFileSize;

  /**
   * Reloads the list whenever the selected patient changes or the user retries the request.
   */
  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const selectedPatient = this.selectedPatient();

      this.appointmentPacks.set([]);
      this.errorMessage.set('');

      if (selectedPatient === null) {
        this.status.set('no-patient');
        return;
      }

      if (!this.authorisation.can(selectedPatient, 'appointment-pack', 'view')) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = this.appointmentPackApi.getAppointmentPacks(selectedPatient.patientRecordId).subscribe({
        next: (appointmentPacks) => {
          this.appointmentPacks.set(appointmentPacks);
          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Tries to load the Appointment Packs again.
   */
  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  /**
   * Handles problems loading Appointment Packs and refreshes patient access when needed.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load appointment packs.'));
  }

  /**
   * Refreshes the patients currently available to the user after an access change.
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
