import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatAddressLines } from '../../../../shared/utils/formatting';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { HealthcareContactResponse } from '../../models/healthcare-contact-model';
import { HealthcareContactApiService } from '../../services/healthcare-contact-api-service';

type HealthcareContactDetailsStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-healthcare-contact-details',
  imports: [DatePipe, RouterLink],
  templateUrl: './healthcare-contact-details.html',
})
export class HealthcareContactDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly healthcareContactApi = inject(HealthcareContactApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly contact = signal<HealthcareContactResponse | null>(null);
  protected readonly status = signal<HealthcareContactDetailsStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isArchiving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'contact', 'edit'));
  protected readonly formatAddress = (contact: HealthcareContactResponse) => formatAddressLines(contact.address);

  constructor() {
    effect(() => {
      const contact = this.contact();
      const selectedPatient = this.selectedPatient();

      if (contact !== null && (selectedPatient === null || contact.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/contacts']);
      }
    });
  }

  ngOnInit(): void {
    const contactId = this.route.snapshot.paramMap.get('contactId');

    if (contactId === null || contactId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadContact(contactId);
  }

  protected retry(): void {
    const contactId = this.route.snapshot.paramMap.get('contactId');

    if (contactId !== null) {
      this.loadContact(contactId);
    }
  }

  protected archive(): void {
    const contact = this.contact();
    this.actionError.set('');

    if (contact === null || !this.canEdit() || this.status() !== 'ready') {
      return;
    }

    if (!window.confirm('Archive this healthcare contact? It will no longer appear in the contacts list.')) {
      return;
    }

    this.isArchiving.set(true);

    this.healthcareContactApi.archiveHealthcareContact(contact.id).pipe(
      finalize(() => this.isArchiving.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/contacts']),
      error: (error: unknown) => this.handleArchiveError(error, contact),
    });
  }

  private loadContact(contactId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set('');
    this.contact.set(null);

    this.healthcareContactApi.getHealthcareContact(contactId).subscribe({
      next: (contact) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || contact.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This healthcare contact is not available for the selected patient.');
          return;
        }

        this.contact.set(contact);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the healthcare contact.'));
  }

  private handleArchiveError(error: unknown, contact: HealthcareContactResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(contact.patientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to archive the healthcare contact.'));
  }

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
