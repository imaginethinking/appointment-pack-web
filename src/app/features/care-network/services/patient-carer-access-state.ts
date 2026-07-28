import { inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';

import { PatientCarerAccessResponse } from '../models/patient-carer-access-model';
import { PatientCarerAccessApiService } from './patient-carer-access-api-service';

@Injectable({
  providedIn: 'root',
})
export class PatientCarerAccessState {
  private readonly accessApi = inject(PatientCarerAccessApiService);

  private readonly asCarerRelationshipsValue = signal<readonly PatientCarerAccessResponse[]>([]);

  private readonly loadingValue = signal(false);

  readonly asCarerRelationships = this.asCarerRelationshipsValue.asReadonly();

  readonly isLoading = this.loadingValue.asReadonly();

  loadAsCarer(): Observable<PatientCarerAccessResponse[]> {
    this.loadingValue.set(true);

    return this.accessApi.getAsCarer().pipe(
      tap((relationships) => {
        this.asCarerRelationshipsValue.set(relationships);
      }),
      finalize(() => {
        this.loadingValue.set(false);
      })
    );
  }

  reset(): void {
    this.asCarerRelationshipsValue.set([]);
    this.loadingValue.set(false);
  }
}
