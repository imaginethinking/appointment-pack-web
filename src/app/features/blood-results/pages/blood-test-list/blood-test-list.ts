import {DatePipe} from '@angular/common';
import {Component, computed, effect, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {formatEnumLabel} from '../../../../shared/utils/formatting';
import {getPatientContextName} from '../../../patient-context/models/selected-patient-context';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {BloodTestResponse} from '../../models/blood-test-model';
import {BloodTestApiService} from '../../services/blood-test-api-service';

type BloodTestListStatus = 'loading' | 'ready' | 'no-patient' | 'forbidden' | 'error';

/**
 * Shows the blood tests available for the selected patient.
 */
@Component({
  selector: 'app-blood-test-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './blood-test-list.html',
})
export class BloodTestList {
  private readonly bloodTestApi = inject(BloodTestApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly reloadVersion = signal(0);

  protected readonly bloodTests = signal<readonly BloodTestResponse[]>([]);
  protected readonly status = signal<BloodTestListStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEditBloodResults = computed(() => this.authorisation.can(this.selectedPatient(), 'blood-result', 'edit'));
  protected readonly getPatientContextName = getPatientContextName;
  protected readonly formatFlag = formatEnumLabel;

  /**
   * Reloads the blood test list when the selected patient changes or a retry is requested.
   */
  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const selectedPatient = this.selectedPatient();

      this.bloodTests.set([]);
      this.errorMessage.set('');

      if (selectedPatient === null) {
        this.status.set('no-patient');
        return;
      }

      if (!this.authorisation.can(selectedPatient, 'blood-result', 'view')) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = this.bloodTestApi.getBloodTests(selectedPatient.patientRecordId).subscribe({
        next: (bloodTests) => {
          this.bloodTests.set(bloodTests);
          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Starts another attempt to load the blood results.
   */
  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  /**
   * Updates the page when blood results cannot be loaded and refreshes patient access when needed.
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
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load blood results.'));
  }

  /**
   * Reloads the available patient access after the current patient can no longer be used.
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
