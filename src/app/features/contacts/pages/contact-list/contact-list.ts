import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatAddressLines } from '../../../../shared/utils/formatting';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { EmergencyContactResponse } from '../../models/emergency-contact-model';
import { HealthcareContactResponse } from '../../models/healthcare-contact-model';
import { EmergencyContactApiService } from '../../services/emergency-contact-api-service';
import { HealthcareContactApiService } from '../../services/healthcare-contact-api-service';

type ContactListStatus = 'loading' | 'ready' | 'no-patient' | 'forbidden' | 'error';

/**
 * Displays the healthcare and emergency contacts for the selected patient.
 */
@Component({
  selector: 'app-contact-list',
  imports: [RouterLink],
  templateUrl: './contact-list.html',
})
export class ContactList {
  private readonly healthcareContactApi = inject(HealthcareContactApiService);
  private readonly emergencyContactApi = inject(EmergencyContactApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly reloadVersion = signal(0);

  protected readonly healthcareContacts = signal<readonly HealthcareContactResponse[]>([]);
  protected readonly emergencyContacts = signal<readonly EmergencyContactResponse[]>([]);
  protected readonly status = signal<ContactListStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEditContacts = computed(() => this.authorisation.can(this.selectedPatient(), 'contact', 'edit'));
  protected readonly getPatientContextName = getPatientContextName;
  protected readonly formatAddress = (contact: HealthcareContactResponse) => formatAddressLines(contact.address);

  /**
   * Loads both contact lists whenever the selected patient changes or the page is retried.
   */
  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const selectedPatient = this.selectedPatient();

      this.healthcareContacts.set([]);
      this.emergencyContacts.set([]);
      this.errorMessage.set('');

      if (selectedPatient === null) {
        this.status.set('no-patient');
        return;
      }

      if (!this.authorisation.can(selectedPatient, 'contact', 'view')) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = forkJoin({
        healthcareContacts: this.healthcareContactApi.getHealthcareContacts(selectedPatient.patientRecordId),
        emergencyContacts: this.emergencyContactApi.getEmergencyContacts(selectedPatient.patientRecordId),
      }).subscribe({
        next: ({ healthcareContacts, emergencyContacts }) => {
          this.healthcareContacts.set(healthcareContacts);
          this.emergencyContacts.set(emergencyContacts);
          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Reloads the contact lists.
   */
  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  /**
   * Handles contact loading errors and refreshes patient access when needed.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load contacts.'));
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
