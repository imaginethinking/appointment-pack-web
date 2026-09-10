import {DatePipe} from '@angular/common';
import {Component, computed, effect, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {formatAddressLines, formatLocalTime} from '../../../../shared/utils/formatting';
import {getPatientContextName} from '../../../patient-context/models/selected-patient-context';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {AppointmentResponse} from '../../models/appointment-model';
import {AppointmentApiService} from '../../services/appointment-api-service';

type AppointmentListStatus = 'loading' | 'ready' | 'no-patient' | 'forbidden' | 'error';

/**
 * Displays the appointments for the selected patient.
 */
@Component({
  selector: 'app-appointment-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './appointment-list.html',
})
export class AppointmentList {
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly reloadVersion = signal(0);

  protected readonly appointments = signal<readonly AppointmentResponse[]>([]);
  protected readonly status = signal<AppointmentListStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEditAppointments = computed(() => this.authorisation.can(this.selectedPatient(), 'appointment', 'edit'));
  protected readonly getPatientContextName = getPatientContextName;
  protected readonly formatTime = formatLocalTime;
  protected readonly formatAddress = (appointment: AppointmentResponse) => formatAddressLines(appointment.address);

  /**
   * Loads appointments whenever the selected patient changes or the page is retried.
   */
  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const selectedPatient = this.selectedPatient();

      this.appointments.set([]);
      this.errorMessage.set('');

      if (selectedPatient === null) {
        this.status.set('no-patient');
        return;
      }

      if (!this.authorisation.can(selectedPatient, 'appointment', 'view')) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = this.appointmentApi.getAppointments(selectedPatient.patientRecordId).subscribe({
        next: (appointments) => {
          this.appointments.set(appointments);
          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Reloads the appointment list.
   */
  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  /**
   * Handles appointment loading errors and refreshes patient access when needed.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load appointments.'));
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
