import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { PatientRecordResponse } from '../../models/patient-record-model';
import { PatientRecordApiService } from '../../services/patient-record-api-service';

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

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;

  protected readonly isContextLoading = this.patientContextCoordinator.isLoading;

  protected readonly contextLoadFailed = this.patientContextCoordinator.loadFailed;

  protected readonly patientRecord = signal<PatientRecordResponse | null>(null);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    effect((onCleanup) => {
      const context = this.selectedPatient();

      this.patientRecord.set(null);
      this.errorMessage.set('');

      if (context === null) {
        this.isLoading.set(false);
        return;
      }

      this.isLoading.set(true);

      const subscription = this.patientRecordApi
        .getPatientRecord(context.patientRecordId)
        .pipe(
          finalize(() => {
            this.isLoading.set(false);
          }),
        )
        .subscribe({
          next: (patientRecord) => {
            this.patientRecord.set(patientRecord);
          },
          error: (error: unknown) => {
            if (hasHttpStatus(error, 403)) {
              this.errorMessage.set('You do not have permission to view this patient record.');

              return;
            }

            if (hasHttpStatus(error, 404)) {
              this.errorMessage.set('The selected patient record could not be found.');

              return;
            }

            this.errorMessage.set(
              getHttpErrorMessage(error, 'Unable to load the selected patient record.'),
            );
          },
        });

      onCleanup(() => {
        subscription.unsubscribe();
      });
    });
  }

  protected canEdit(): boolean {
    return this.authorisation.can(this.selectedPatient(), 'patient-record', 'edit');
  }

  protected selectedPatientName(): string {
    const context = this.selectedPatient();

    return context === null ? '' : getPatientContextName(context);
  }

  protected contextLabel(): string {
    return this.selectedPatient()?.contextType === 'SELF' ? 'Your record' : 'Carer access';
  }

  protected formatEnum(value: string | null): string {
    if (value === null) {
      return 'Not provided';
    }

    return value
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
