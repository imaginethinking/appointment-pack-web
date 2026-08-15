import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatEnumLabel } from '../../../../shared/utils/formatting';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { PatientRecordResponse } from '../../models/patient-record-model';
import { PatientRecordApiService } from '../../services/patient-record-api-service';

type PatientRecordPageStatus = 'loading' | 'ready' | 'no-selection' | 'forbidden' | 'not-found' | 'error';

@Component({
  selector: 'app-patient-record',
  imports: [RouterLink],
  templateUrl: './patient-record.html',
  styleUrl: './patient-record.css',
})
export class PatientRecord {
  private readonly patientRecordApi = inject(PatientRecordApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly reloadVersion = signal(0);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly patientRecord = signal<PatientRecordResponse | null>(null);
  protected readonly status = signal<PatientRecordPageStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly selectedPatientId = computed(() => this.selectedPatient()?.patientRecordId ?? null);
  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });
  protected readonly contextLabel = computed(() => {
    const selectedPatient = this.selectedPatient();

    if (selectedPatient === null) {
      return '';
    }

    return selectedPatient.contextType === 'SELF' ? 'Your patient record' : 'Shared patient record';
  });
  protected readonly canViewSelectedPatient = computed(() => this.authorisation.can(this.selectedPatient(), 'patient-record', 'view'));
  protected readonly canEditSelectedPatient = computed(() => this.authorisation.can(this.selectedPatient(), 'patient-record', 'edit'));
  protected readonly formatOption = formatEnumLabel;

  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const patientRecordId = this.selectedPatientId();
      const canView = this.canViewSelectedPatient();

      this.patientRecord.set(null);
      this.errorMessage.set('');

      if (patientRecordId === null) {
        this.status.set('no-selection');
        return;
      }

      if (!canView) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = this.patientRecordApi.getPatientRecord(patientRecordId).subscribe({
        next: (patientRecord) => {
          this.patientRecord.set(patientRecord);
          this.status.set('ready');
        },
        error: (error) => this.handleLoadError(error, patientRecordId),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  protected formatMeasurement(value: number | null, unit: string | null): string {
    if (value === null) {
      return 'Not provided';
    }

    return unit === null ? value.toString() : `${value} ${formatEnumLabel(unit)}`;
  }

  protected formatNumber(value: number | null): string {
    return value === null ? 'Not provided' : value.toString();
  }

  protected formatIdentifier(value: string | null): string {
    return value === null || value.trim().length === 0 ? 'Not provided' : value;
  }

  private handleLoadError(error: unknown, failedPatientRecordId: string): void {
    this.patientRecord.set(null);

    if (!hasHttpStatus(error, 403) && !hasHttpStatus(error, 404)) {
      this.status.set('error');
      this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the selected patient record.'));
      return;
    }

    const recordNotFound = hasHttpStatus(error, 404);
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const currentPatientRecordId = this.selectedPatientId();

        if (currentPatientRecordId === null) {
          this.status.set('no-selection');
          return;
        }

        if (currentPatientRecordId !== failedPatientRecordId) {
          return;
        }

        if (!this.canViewSelectedPatient()) {
          this.status.set('forbidden');
          return;
        }

        this.status.set(recordNotFound ? 'not-found' : 'forbidden');
      },
      error: (refreshError) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh your patient access.'));
      },
    });
  }
}
