import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatFileSize } from '../../../../shared/utils/formatting';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import {
  APPOINTMENT_PACK_ITEM_TYPES,
  AppointmentPackItemResponse,
  AppointmentPackItemType,
  AppointmentPackResponse,
  getAppointmentPackItemTypePluralLabel,
} from '../../models/appointment-pack-model';
import { AppointmentPackApiService } from '../../services/appointment-pack-api-service';

type AppointmentPackDetailsStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-appointment-pack-details',
  imports: [DatePipe, RouterLink],
  templateUrl: './appointment-pack-details.html',
})
export class AppointmentPackDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appointmentPackApi = inject(AppointmentPackApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly appointmentPack = signal<AppointmentPackResponse | null>(null);
  protected readonly status = signal<AppointmentPackDetailsStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isDownloading = signal(false);
  protected readonly isArchiving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canArchive = computed(() => this.authorisation.can(this.selectedPatient(), 'appointment-pack', 'create'));
  protected readonly canViewAppointment = computed(() => this.authorisation.can(this.selectedPatient(), 'appointment', 'view'));
  protected readonly formatFileSize = formatFileSize;
  protected readonly itemTypes = APPOINTMENT_PACK_ITEM_TYPES;
  protected readonly getItemTypePluralLabel = getAppointmentPackItemTypePluralLabel;

  constructor() {
    effect(() => {
      const appointmentPack = this.appointmentPack();
      const selectedPatient = this.selectedPatient();

      if (appointmentPack !== null && (selectedPatient === null || appointmentPack.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/appointment-packs']);
      }
    });
  }

  ngOnInit(): void {
    const appointmentPackId = this.route.snapshot.paramMap.get('appointmentPackId');

    if (appointmentPackId === null || appointmentPackId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadAppointmentPack(appointmentPackId);
  }

  protected retry(): void {
    const appointmentPackId = this.route.snapshot.paramMap.get('appointmentPackId');

    if (appointmentPackId !== null) {
      this.loadAppointmentPack(appointmentPackId);
    }
  }

  protected download(): void {
    const appointmentPack = this.appointmentPack();
    this.actionError.set('');

    if (appointmentPack === null || this.status() !== 'ready') {
      return;
    }

    this.isDownloading.set(true);

    this.appointmentPackApi.downloadAppointmentPack(appointmentPack.id).pipe(
      finalize(() => this.isDownloading.set(false)),
    ).subscribe({
      next: (response) => {
        if (response.body === null) {
          this.actionError.set('The downloaded appointment-pack file was empty.');
          return;
        }

        const url = URL.createObjectURL(response.body);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = appointmentPack.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => this.handleDownloadError(error, appointmentPack),
    });
  }

  protected archive(): void {
    const appointmentPack = this.appointmentPack();
    this.actionError.set('');

    if (appointmentPack === null || !this.canArchive() || this.status() !== 'ready') {
      return;
    }

    if (!window.confirm('Archive this appointment pack? The generated snapshot will no longer appear in the normal pack list.')) {
      return;
    }

    this.isArchiving.set(true);

    this.appointmentPackApi.archiveAppointmentPack(appointmentPack.id).pipe(
      finalize(() => this.isArchiving.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/appointment-packs']),
      error: (error: unknown) => this.handleArchiveError(error, appointmentPack),
    });
  }

  protected itemsFor(itemType: AppointmentPackItemType): readonly AppointmentPackItemResponse[] {
    return this.appointmentPack()?.items.filter((item) => item.resourceType === itemType) ?? [];
  }

  protected canOpenItem(itemType: AppointmentPackItemType): boolean {
    const selectedPatient = this.selectedPatient();

    switch (itemType) {
      case 'MEDICATION':
        return this.authorisation.can(selectedPatient, 'medication', 'view');
      case 'HEALTHCARE_CONTACT':
      case 'EMERGENCY_CONTACT':
        return this.authorisation.can(selectedPatient, 'contact', 'view');
      case 'MEDICAL_HISTORY':
        return this.authorisation.can(selectedPatient, 'history', 'view');
      case 'BLOOD_TEST':
        return this.authorisation.can(selectedPatient, 'blood-result', 'view');
    }
  }

  protected itemRoute(item: AppointmentPackItemResponse): string[] {
    switch (item.resourceType) {
      case 'MEDICATION':
        return ['/medications', item.resourceId];
      case 'HEALTHCARE_CONTACT':
        return ['/contacts/healthcare', item.resourceId];
      case 'EMERGENCY_CONTACT':
        return ['/contacts/emergency', item.resourceId];
      case 'MEDICAL_HISTORY':
        return ['/medical-history', item.resourceId];
      case 'BLOOD_TEST':
        return ['/blood-results', item.resourceId];
    }
  }

  private loadAppointmentPack(appointmentPackId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set('');
    this.appointmentPack.set(null);

    this.appointmentPackApi.getAppointmentPack(appointmentPackId).subscribe({
      next: (appointmentPack) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || appointmentPack.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This appointment pack does not belong to the currently selected patient.');
          return;
        }

        this.appointmentPack.set(appointmentPack);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  private handleLoadError(error: unknown, failedPatientRecordId: string | null): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(failedPatientRecordId, 'view');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the appointment pack.'));
  }

  private handleDownloadError(error: unknown, appointmentPack: AppointmentPackResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(appointmentPack.patientRecordId, 'view');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to download the appointment pack.'));
  }

  private handleArchiveError(error: unknown, appointmentPack: AppointmentPackResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(appointmentPack.patientRecordId, 'archive');
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to archive the appointment pack.'));
  }

  private recoverPatientAccess(failedPatientRecordId: string | null, action: 'view' | 'archive'): void {
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/appointment-packs']);
          return;
        }

        if (!this.authorisation.can(selectedPatient, 'appointment-pack', 'view')) {
          this.status.set('forbidden');
          return;
        }

        if (action === 'archive') {
          this.status.set('ready');
          this.actionError.set('You no longer have permission to archive appointment packs for this patient.');
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
