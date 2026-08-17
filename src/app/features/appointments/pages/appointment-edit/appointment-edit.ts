import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { AppointmentFormFields } from '../../components/appointment-form-fields/appointment-form-fields';
import { createAppointmentForm, mapAppointmentFormToRequest, resetAppointmentForm } from '../../forms/appointment-form';
import { AppointmentResponse } from '../../models/appointment-model';
import { AppointmentApiService } from '../../services/appointment-api-service';

type AppointmentEditStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-appointment-edit',
  imports: [ReactiveFormsModule, RouterLink, AppointmentFormFields],
  templateUrl: './appointment-edit.html',
})
export class AppointmentEdit implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly appointment = signal<AppointmentResponse | null>(null);
  protected readonly status = signal<AppointmentEditStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly isSaving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'appointment', 'edit'));
  protected readonly form = createAppointmentForm(this.formBuilder);

  constructor() {
    effect(() => {
      const appointment = this.appointment();
      const selectedPatient = this.selectedPatient();

      if (appointment !== null && (selectedPatient === null || appointment.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/appointments']);
      }
    });
  }

  ngOnInit(): void {
    const appointmentId = this.route.snapshot.paramMap.get('appointmentId');

    if (appointmentId === null || appointmentId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadAppointment(appointmentId);
  }

  protected save(): void {
    const appointment = this.appointment();

    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    if (appointment === null || this.status() !== 'ready') {
      return;
    }

    if (!this.canEdit()) {
      this.status.set('forbidden');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    this.appointmentApi.updateAppointment(appointment.id, mapAppointmentFormToRequest(this.form)).pipe(
      finalize(() => this.isSaving.set(false)),
    ).subscribe({
      next: (updatedAppointment) => void this.router.navigate(['/appointments', updatedAppointment.id]),
      error: (error: unknown) => this.handleSaveError(error, appointment),
    });
  }

  protected retry(): void {
    const appointmentId = this.route.snapshot.paramMap.get('appointmentId');

    if (appointmentId !== null) {
      this.loadAppointment(appointmentId);
    }
  }

  private loadAppointment(appointmentId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.appointment.set(null);

    this.appointmentApi.getAppointment(appointmentId).subscribe({
      next: (appointment) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || appointment.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This appointment is not available for the selected patient.');
          return;
        }

        if (!this.canEdit()) {
          this.status.set('forbidden');
          return;
        }

        this.appointment.set(appointment);
        resetAppointmentForm(this.form, appointment);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the appointment for editing.'));
  }

  private handleSaveError(error: unknown, appointment: AppointmentResponse): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(appointment.patientRecordId, 'forbidden');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.recoverPatientAccess(appointment.patientRecordId, 'not-found');
      return;
    }

    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to update the appointment.'));
  }

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
