import {inject, Injectable, signal} from '@angular/core';
import {catchError, finalize, Observable, of, tap, throwError} from 'rxjs';

import { hasHttpStatus} from '../../../core/http/http-problem-detail';
import {CreatePatientRecordRequest, PatientRecordResponse, UpdatePatientRecordRequest} from '../models/patient-record-model';
import {PatientRecordApiService} from './patient-record-api-service';

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

  reset(): void {
    this.patientRecordValue.set(null);
    this.loadingValue.set(false);
    this.savingValue.set(false);
  }
}
