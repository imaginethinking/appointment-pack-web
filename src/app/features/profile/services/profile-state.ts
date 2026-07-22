import { inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';

import { ProfileResponse, UpdateProfileRequest } from '../models/profile-model';
import { ProfileApiService } from './profile-api-service';

@Injectable({
  providedIn: 'root',
})
export class ProfileState {
  private readonly profileApi = inject(ProfileApiService);

  private readonly profileValue = signal<ProfileResponse | null>(null);

  private readonly loadingValue = signal(false);
  private readonly savingValue = signal(false);

  readonly profile = this.profileValue.asReadonly();
  readonly isLoading = this.loadingValue.asReadonly();
  readonly isSaving = this.savingValue.asReadonly();

  loadCurrentProfile(): Observable<ProfileResponse> {
    this.loadingValue.set(true);

    return this.profileApi.getCurrentProfile().pipe(
      tap((profile) => {
        this.profileValue.set(profile);
      }),
      finalize(() => {
        this.loadingValue.set(false);
      })
    );
  }

  updateCurrentProfile(request: UpdateProfileRequest): Observable<ProfileResponse> {
    this.savingValue.set(true);

    return this.profileApi.updateCurrentProfile(request).pipe(
      tap((profile) => {
        this.profileValue.set(profile);
      }),
      finalize(() => {
        this.savingValue.set(false);
      })
    );
  }

  reset(): void {
    this.profileValue.set(null);
    this.loadingValue.set(false);
    this.savingValue.set(false);
  }
}
