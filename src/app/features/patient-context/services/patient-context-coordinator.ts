import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, forkJoin, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';

import { PatientCarerAccessState } from '../../care-network/services/patient-carer-access-state';
import { PersonalPatientRecordState } from '../../patient-record/services/personal-patient-record-state';
import { ProfileState } from '../../profile/services/profile-state';
import { SelectedPatientState } from './selected-patient-state';

@Injectable({
  providedIn: 'root',
})
export class PatientContextCoordinator {
  private readonly profileState = inject(ProfileState);
  private readonly personalPatientRecordState = inject(PersonalPatientRecordState);
  private readonly patientCarerAccessState = inject(PatientCarerAccessState);
  private readonly selectedPatientState = inject(SelectedPatientState);

  private readonly loadingValue = signal(false);
  private readonly loadedValue = signal(false);
  private readonly loadFailedValue = signal(false);
  private loadRequest: Observable<void> | null = null;

  readonly isLoading = this.loadingValue.asReadonly();
  readonly isLoaded = this.loadedValue.asReadonly();
  readonly loadFailed = this.loadFailedValue.asReadonly();

  load(): Observable<void> {
    if (this.loadedValue()) {
      return of(undefined);
    }

    if (this.loadRequest !== null) {
      return this.loadRequest;
    }

    this.loadingValue.set(true);
    this.loadFailedValue.set(false);

    this.loadRequest = forkJoin({
      profile: this.profileState.loadCurrentProfile(),
      personalPatientRecord: this.personalPatientRecordState.loadCurrentPatientRecord(),
      carerRelationships: this.patientCarerAccessState.loadAsCarer(),
    }).pipe(
      tap(() => {
        this.selectedPatientState.revalidateSelection();
        this.loadedValue.set(true);
      }),
      map(() => undefined),
      catchError((error: unknown) => {
        this.loadFailedValue.set(true);
        return throwError(() => error);
      }),
      finalize(() => {
        this.loadingValue.set(false);
        this.loadRequest = null;
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    return this.loadRequest;
  }

  reloadCarerAccess(): Observable<void> {
    this.loadingValue.set(true);
    this.loadFailedValue.set(false);

    return this.patientCarerAccessState.loadAsCarer().pipe(
      tap(() => this.selectedPatientState.revalidateSelection()),
      map(() => undefined),
      catchError((error: unknown) => {
        this.loadFailedValue.set(true);
        return throwError(() => error);
      }),
      finalize(() => this.loadingValue.set(false)),
    );
  }

  refreshSelectedPatientAccess(): Observable<void> {
    const selectedPatientRecordId = this.selectedPatientState.selectedPatientRecordId();

    if (selectedPatientRecordId === null) {
      return of(undefined);
    }

    const selectedPatient = this.selectedPatientState.selectedPatient();

    if (selectedPatient?.contextType === 'SELF') {
      return of(undefined);
    }

    return this.reloadCarerAccess();
  }

  reset(): void {
    this.profileState.reset();
    this.personalPatientRecordState.reset();
    this.patientCarerAccessState.reset();
    this.selectedPatientState.reset();

    this.loadRequest = null;
    this.loadingValue.set(false);
    this.loadedValue.set(false);
    this.loadFailedValue.set(false);
  }
}
