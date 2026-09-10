import {Component, DestroyRef, effect, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {AppointmentPackResponse} from '../../models/appointment-pack-model';
import {AppointmentPackApiService} from '../../services/appointment-pack-api-service';

type AppointmentPackPreviewStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

/**
 * Loads an Appointment Pack PDF and displays it in the browser for the selected patient.
 */
@Component({
  selector: 'app-appointment-pack-preview',
  imports: [RouterLink],
  templateUrl: './appointment-pack-preview.html',
})
export class AppointmentPackPreview implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly appointmentPackApi = inject(AppointmentPackApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private previewObjectUrl: string | null = null;

  protected readonly appointmentPack = signal<AppointmentPackResponse | null>(null);
  protected readonly previewUrl = signal<SafeResourceUrl | null>(null);
  protected readonly status = signal<AppointmentPackPreviewStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isDownloading = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;

  /**
   * Clears the preview and returns to the pack list if the selected patient changes.
   */
  constructor() {
    effect(() => {
      const appointmentPack = this.appointmentPack();
      const selectedPatient = this.selectedPatient();

      if (
        appointmentPack !== null
        && (selectedPatient === null || appointmentPack.patientRecordId !== selectedPatient.patientRecordId)
      ) {
        this.clearPreviewUrl();
        void this.router.navigate(['/appointment-packs']);
      }
    });
  }

  /**
   * Loads the Appointment Pack preview identified by the current route.
   */
  ngOnInit(): void {
    const appointmentPackId = this.route.snapshot.paramMap.get('appointmentPackId');

    if (appointmentPackId === null || appointmentPackId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadPreview(appointmentPackId);
  }

  /**
   * Releases the temporary PDF URL when the preview page is destroyed.
   */
  ngOnDestroy(): void {
    this.clearPreviewUrl();
  }

  /**
   * Tries to load the current Appointment Pack preview again.
   */
  protected retry(): void {
    const appointmentPackId = this.route.snapshot.paramMap.get('appointmentPackId');

    if (appointmentPackId !== null) {
      this.loadPreview(appointmentPackId);
    }
  }

  /**
   * Downloads the Appointment Pack currently being previewed.
   */
  protected download(): void {
    const appointmentPack = this.appointmentPack();
    this.actionError.set('');

    if (appointmentPack === null || this.status() !== 'ready') {
      return;
    }

    this.isDownloading.set(true);

    this.appointmentPackApi.downloadAppointmentPack(appointmentPack.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isDownloading.set(false)),
    ).subscribe({
      next: (response) => {
        if (response.body === null || response.body.size === 0) {
          this.actionError.set('The downloaded appointment pack was empty.');
          return;
        }

        // Create a temporary URL for the PDF and release it after starting the download.
        const url = URL.createObjectURL(response.body);
        const anchor = window.document.createElement('a');

        anchor.href = url;
        anchor.download = appointmentPack.fileName;
        anchor.click();

        URL.revokeObjectURL(url);
      },
      error: (error: unknown) => this.handleFileError(error, appointmentPack, 'download'),
    });
  }

  /**
   * Loads the Appointment Pack details before requesting its PDF preview.
   */
  private loadPreview(appointmentPackId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.clearPreviewUrl();
    this.appointmentPack.set(null);
    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set('');

    this.appointmentPackApi.getAppointmentPack(appointmentPackId).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (appointmentPack) => {
        const selectedPatient = this.selectedPatient();

        if (
          selectedPatient === null
          || appointmentPack.patientRecordId !== selectedPatient.patientRecordId
        ) {
          this.status.set('invalid');
          this.errorMessage.set('This appointment pack is not available for the selected patient.');
          return;
        }

        this.appointmentPack.set(appointmentPack);
        this.loadPdf(appointmentPack);
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  /**
   * Loads the PDF for the Appointment Pack and prepares it for display.
   */
  private loadPdf(appointmentPack: AppointmentPackResponse): void {
    this.appointmentPackApi.previewAppointmentPack(appointmentPack.id).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (pdf) => {
        if (pdf.size === 0) {
          this.status.set('error');
          this.errorMessage.set('The appointment pack preview was empty.');
          return;
        }

        this.setPreviewUrl(pdf);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleFileError(error, appointmentPack, 'preview'),
    });
  }

  /**
   * Creates the browser URL used by the PDF preview and replaces any previous one.
   */
  private setPreviewUrl(pdf: Blob): void {
    this.clearPreviewUrl();

    const objectUrl = URL.createObjectURL(pdf);

    this.previewObjectUrl = objectUrl;
    this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
  }

  /**
   * Releases the current preview URL and clears it from the page.
   */
  private clearPreviewUrl(): void {
    if (this.previewObjectUrl !== null) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }

    this.previewUrl.set(null);
  }

  /**
   * Handles failures while loading the Appointment Pack details.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the appointment pack preview.'));
  }

  /**
   * Handles errors raised while previewing or downloading the Appointment Pack PDF.
   */
  private handleFileError(
    error: unknown,
    appointmentPack: AppointmentPackResponse,
    action: 'preview' | 'download',
  ): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(appointmentPack.patientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.clearPreviewUrl();
      this.status.set('not-found');
      return;
    }

    if (action === 'download') {
      this.actionError.set(getHttpErrorMessage(error, 'Unable to download the appointment pack.'));
      return;
    }

    this.clearPreviewUrl();
    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the appointment pack preview.'));
  }

  /**
   * Refreshes patient access and returns to the pack list when the original patient is no longer selected.
   */
  private recoverPatientAccess(failedPatientRecordId: string | null): void {
    this.clearPreviewUrl();
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (
          failedPatientRecordId !== null
          && selectedPatient?.patientRecordId !== failedPatientRecordId
        ) {
          void this.router.navigate(['/appointment-packs']);
          return;
        }

        if (!this.authorisation.can(selectedPatient, 'appointment-pack', 'view')) {
          this.status.set('forbidden');
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
