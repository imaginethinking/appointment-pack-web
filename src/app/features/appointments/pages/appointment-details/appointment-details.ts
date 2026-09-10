import {DatePipe} from '@angular/common';
import {Component, computed, effect, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {formatAddressLines, formatLocalTime} from '../../../../shared/utils/formatting';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {AppointmentResponse} from '../../models/appointment-model';
import {AppointmentApiService} from '../../services/appointment-api-service';

type AppointmentDetailsStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

/**
 * Displays the details of an appointment for the selected patient.
 */
@Component({
  selector: 'app-appointment-details',
  imports: [DatePipe, RouterLink],
  templateUrl: './appointment-details.html',
})
export class AppointmentDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly appointment = signal<AppointmentResponse | null>(null);
  protected readonly status = signal<AppointmentDetailsStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isArchiving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'appointment', 'edit'));
  protected readonly formatTime = formatLocalTime;
  protected readonly formatAddress = (appointment: AppointmentResponse) => formatAddressLines(appointment.address);

  /**
   * Returns to the appointment list if the loaded appointment no longer matches the selected patient.
   */
  constructor() {
    effect(() => {
      const appointment = this.appointment();
      const selectedPatient = this.selectedPatient();

      if (appointment !== null && (selectedPatient === null || appointment.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/appointments']);
      }
    });
  }

  /**
   * Loads the appointment from the id in the current route.
   */
  ngOnInit(): void {
    const appointmentId = this.route.snapshot.paramMap.get('appointmentId');

    if (appointmentId === null || appointmentId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadAppointment(appointmentId);
  }

  /**
   * Reloads the current appointment.
   */
  protected retry(): void {
    const appointmentId = this.route.snapshot.paramMap.get('appointmentId');

    if (appointmentId !== null) {
      this.loadAppointment(appointmentId);
    }
  }

  /**
   * Confirms and archives the current appointment.
   */
  protected archive(): void {
    const appointment = this.appointment();
    this.actionError.set('');

    if (appointment === null || !this.canEdit() || this.status() !== 'ready') {
      return;
    }

    if (!window.confirm('Archive this appointment? It will no longer appear in the appointment list.')) {
      return;
    }

    this.isArchiving.set(true);

    this.appointmentApi.archiveAppointment(appointment.id).pipe(
      finalize(() => this.isArchiving.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/appointments']),
      error: (error: unknown) => this.handleArchiveError(error, appointment),
    });
  }

  /**
   * Loads the appointment and checks that it belongs to the selected patient.
   */
  private loadAppointment(appointmentId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set('');
    this.appointment.set(null);

    this.appointmentApi.getAppointment(appointmentId).subscribe({
      next: (appointment) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || appointment.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This appointment is not available for the selected patient.');
          return;
        }

        this.appointment.set(appointment);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  /**
   * Handles appointment loading errors and refreshes patient access when needed.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the appointment.'));
  }

  /**
   * Handles appointment archive errors and refreshes patient access when needed.
   */
  private handleArchiveError(error: unknown, appointment: AppointmentResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(appointment.patientRecordId, 'forbidden');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.recoverPatientAccess(appointment.patientRecordId, 'not-found');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to archive the appointment.'));
  }

  /**
   * Refreshes patient access and returns to the appointment list if the selected patient has changed.
   */
  private recoverPatientAccess(failedPatientRecordId: string | null, fallbackStatus: 'forbidden' | 'not-found'): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/appointments']);
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
