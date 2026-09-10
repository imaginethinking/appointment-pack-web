import {inject, Injectable, signal} from '@angular/core';
import {catchError, finalize, Observable, of, tap, throwError} from 'rxjs';

import {hasHttpStatus} from '../../../core/http/http-problem-detail';
import {
  CreatePatientRecordRequest,
  PatientRecordResponse,
  UpdatePatientRecordRequest
} from '../models/patient-record-model';
import {PatientRecordApiService} from './patient-record-api-service';

/**
 * Keeps the user's own patient record and its loading and saving state.
 */
@Injectable({
  providedIn: 'root'
})
export class PersonalPatientRecordState {
  private readonly patientRecordApi = inject(PatientRecordApiService);

  private readonly patientRecordValue = signal<PatientRecordResponse | null>(null);
  private readonly loadingValue = signal(false);
  private readonly savingValue = signal(false);

  readonly patientRecord = this.patientRecordValue.asReadonly();

  readonly isLoading = this.loadingValue.asReadonly();
  readonly isSaving = this.savingValue.asReadonly();

  /**
   * Loads the user's patient record and treats a missing record as an empty state.
   */
  loadCurrentPatientRecord():
    Observable<PatientRecordResponse | null> {
    this.loadingValue.set(true);

    return this.patientRecordApi
      .getCurrentPatientRecord()
      .pipe(
        tap((patientRecord) => {
          this.patientRecordValue.set(patientRecord);
        }),
        catchError((error: unknown) => {
          // A missing record is expected when the user has not created their patient record yet.
          if (hasHttpStatus(error, 404)) {
            this.patientRecordValue.set(null);
            return of(null);
          }

          return throwError(() => error);
        }),
        finalize(() => {
          this.loadingValue.set(false);
        })
      );
  }

  /**
   * Creates the user's patient record and stores the new record in the shared state.
   */
  createPatientRecord(request: CreatePatientRecordRequest): Observable<PatientRecordResponse> {
    this.savingValue.set(true);

    return this.patientRecordApi
      .createPatientRecord(request)
      .pipe(
        tap((patientRecord) => {
          this.patientRecordValue.set(patientRecord);
        }),
        finalize(() => {
          this.savingValue.set(false);
        })
      );
  }

  /**
   * Saves changes to the loaded patient record and updates the shared state.
   */
  updateCurrentPatientRecord(request: UpdatePatientRecordRequest): Observable<PatientRecordResponse> {
    const patientRecord = this.patientRecordValue();

    if (patientRecord === null) {
      return throwError(
        () => new Error(
          'No personal patient record is loaded.'
        )
      );
    }

    this.savingValue.set(true);

    return this.patientRecordApi
      .updatePatientRecord(
        patientRecord.id,
        request
      )
      .pipe(
        tap((updatedPatientRecord) => {
          this.patientRecordValue.set(
            updatedPatientRecord
          );
        }),
        finalize(() => {
          this.savingValue.set(false);
        })
      );
  }

  /**
   * Clears the patient record and resets its loading and saving state.
   */
  reset(): void {
    this.patientRecordValue.set(null);
    this.loadingValue.set(false);
    this.savingValue.set(false);
  }
}
