import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatEnumLabel } from '../../../../shared/utils/formatting';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { BloodTestResponse } from '../../models/blood-test-model';
import { BloodTestApiService } from '../../services/blood-test-api-service';

type BloodTestListStatus = 'loading' | 'ready' | 'no-patient' | 'forbidden' | 'error';

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

  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

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

  private refreshPatientAccess(): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      error: (error: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to refresh patient access.'));
      },
    });
  }
}
