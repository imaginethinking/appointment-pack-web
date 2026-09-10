import {DatePipe} from '@angular/common';
import {Component, computed, effect, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {EmergencyContactResponse} from '../../models/emergency-contact-model';
import {EmergencyContactApiService} from '../../services/emergency-contact-api-service';

type EmergencyContactDetailsStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

/**
 * Displays an emergency contact for the selected patient.
 */
@Component({
  selector: 'app-emergency-contact-details',
  imports: [DatePipe, RouterLink],
  templateUrl: './emergency-contact-details.html',
})
export class EmergencyContactDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly emergencyContactApi = inject(EmergencyContactApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly contact = signal<EmergencyContactResponse | null>(null);
  protected readonly status = signal<EmergencyContactDetailsStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isArchiving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'contact', 'edit'));

  /**
   * Returns to the contacts page if the loaded contact no longer belongs to the selected patient.
   */
  constructor() {
    effect(() => {
      const contact = this.contact();
      const selectedPatient = this.selectedPatient();

      if (contact !== null && (selectedPatient === null || contact.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/contacts']);
      }
    });
  }

  /**
   * Loads the emergency contact from the id in the current route.
   */
  ngOnInit(): void {
    const contactId = this.route.snapshot.paramMap.get('contactId');

    if (contactId === null || contactId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadContact(contactId);
  }

  /**
   * Reloads the current emergency contact.
   */
  protected retry(): void {
    const contactId = this.route.snapshot.paramMap.get('contactId');

    if (contactId !== null) {
      this.loadContact(contactId);
    }
  }

  /**
   * Confirms and archives the current emergency contact.
   */
  protected archive(): void {
    const contact = this.contact();
    this.actionError.set('');

    if (contact === null || !this.canEdit() || this.status() !== 'ready') {
      return;
    }

    if (!window.confirm('Archive this emergency contact? It will no longer appear in the contacts list.')) {
      return;
    }

    this.isArchiving.set(true);

    this.emergencyContactApi.archiveEmergencyContact(contact.id).pipe(
      finalize(() => this.isArchiving.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/contacts']),
      error: (error: unknown) => this.handleArchiveError(error, contact),
    });
  }

  /**
   * Loads the emergency contact and checks that it belongs to the selected patient.
   */
  private loadContact(contactId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set('');
    this.contact.set(null);

    this.emergencyContactApi.getEmergencyContact(contactId).subscribe({
      next: (contact) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || contact.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This emergency contact is not available for the selected patient.');
          return;
        }

        this.contact.set(contact);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  /**
   * Handles contact loading errors and refreshes patient access when needed.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the emergency contact.'));
  }

  /**
   * Handles contact archive errors and refreshes patient access when needed.
   */
  private handleArchiveError(error: unknown, contact: EmergencyContactResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(contact.patientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to archive the emergency contact.'));
  }

  /**
   * Refreshes patient access and returns to the contacts page if the selected patient has changed.
   */
  private recoverPatientAccess(failedPatientRecordId: string | null): void {
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/contacts']);
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
