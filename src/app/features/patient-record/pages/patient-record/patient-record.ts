import {Component, inject, OnInit, signal} from '@angular/core';
import { RouterLink } from '@angular/router';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {PersonalPatientRecordState} from '../../services/personal-patient-record-state';

@Component({
  selector: 'app-patient-record',
  imports: [
    RouterLink
  ],
  templateUrl: './patient-record.html',
  styleUrl: './patient-record.css'
})
export class PatientRecord implements OnInit {
  private readonly patientRecordState = inject(PersonalPatientRecordState);

  protected readonly patientRecord = this.patientRecordState.patientRecord;

  protected readonly isLoading = this.patientRecordState.isLoading;

  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadPatientRecord();
  }

  protected loadPatientRecord(): void {
    this.errorMessage.set('');

    this.patientRecordState
      .loadCurrentPatientRecord()
      .subscribe({
        error: (error: unknown) => {
          this.errorMessage.set(
            getHttpErrorMessage(
              error,
              'Unable to load your patient record.'
            )
          );
        }
      });
  }

  protected formatEnum(value: string | null): string {
    if (value === null) {
      return 'Not provided';
    }

    return value
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, character => character.toUpperCase());
  }
}
