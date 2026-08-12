import {Component, effect, inject, signal,} from '@angular/core';

import {getHttpErrorMessage,} from '../../../../core/http/http-error-message';
import {hasHttpStatus,} from '../../../../core/http/http-problem-detail';
import {getPatientContextName,} from '../../../patient-context/models/selected-patient-context';
import {PatientContextAuthorisation,} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator,} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState,} from '../../../patient-context/services/selected-patient-state';
import {AppointmentResponse,} from '../../models/appointment-model';
import {AppointmentApiService,} from '../../services/appointment-api-service';
import {RouterLink} from '@angular/router';
import {DatePipe} from '@angular/common';

type AppointmentListStatus =
  | 'loading'
  | 'ready'
  | 'no-patient'
  | 'forbidden'
  | 'error';

@Component({
  selector: 'app-appointment-list',
  imports: [
    RouterLink,
    DatePipe
  ],
  templateUrl: './appointment-list.html',
})
export class AppointmentList {
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly appointments = signal<readonly AppointmentResponse[]>([],);
  protected readonly status = signal<AppointmentListStatus>('loading');
  protected readonly errorMessage = signal('');

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly getPatientContextName = getPatientContextName;

  constructor() {
    effect((onCleanup) => {
      const selectedPatient = this.selectedPatient();

      this.appointments.set([]);
      this.errorMessage.set('');

      if (selectedPatient === null) {
        this.status.set(
          'no-patient',
        );

        return;
      }

      if (
        !this.authorisation.can(
          selectedPatient,
          'appointment',
          'view',
        )
      ) {
        this.status.set('forbidden');

        return;
      }

      this.status.set('loading');

      const subscription = this.appointmentApi
        .getAppointments(
          selectedPatient.patientRecordId,
        )
        .subscribe({
          next: (appointments) => {
            this.appointments.set(appointments);

            this.status.set('ready');
          },

          error: (error: unknown) => {
            this.handleLoadError(
              error,
            );
          },
        });

      onCleanup(() => {
        subscription.unsubscribe();
      });
    });
  }

  protected formatTime(value: string,): string {
    if (value.length < 5) {
      return value;
    }

    return value.substring(0, 5,);
  }

  protected formatAddress(appointment: AppointmentResponse): string[] {
    const address = appointment.address;

    if (address === null) {
      return [];
    }

    return [
      address.addressLine1,
      address.addressLine2,
      address.townCity,
      address.county,
      address.postcode,
      address.country,
    ].filter(
      (
        value,
      ): value is string =>
        value !== null &&
        value.trim().length > 0,
    );
  }

  protected retry(): void {
    this.patientContextCoordinator
      .load()
      .subscribe({
        error: (error: unknown) => {
          this.errorMessage.set(
            getHttpErrorMessage(
              error,
              'Unable to refresh patient access.',
            ),
          );
        },
      });
  }

  private handleLoadError(error: unknown): void {
    if (
      hasHttpStatus(
        error,
        403,
      )
    ) {
      this.status.set('forbidden');

      this.refreshPatientContext();

      return;
    }

    if (
      hasHttpStatus(
        error,
        404,
      )
    ) {
      this.status.set('error');

      this.errorMessage.set('The selected patient record is no longer available.');

      this.refreshPatientContext();

      return;
    }

    this.status.set('error');

    this.errorMessage.set(
      getHttpErrorMessage(
        error,
        'Unable to load appointments.',
      ),
    );
  }

  private refreshPatientContext(): void {
    this.patientContextCoordinator
      .load()
      .subscribe({
        error: (error: unknown) => {
          this.status.set('error');

          this.errorMessage.set(
            getHttpErrorMessage(
              error,
              'Unable to refresh patient access.',
            ),
          );
        },
      });
  }
}
