import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';

import {environment} from '../../../../environments/environment';
import {ProfileResponse, UpdateProfileRequest} from '../models/profile-model';

/**
 * Provides the API calls used to load and update the current profile.
 */
@Injectable({
  providedIn: 'root',
})
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly profilesUrl = `${environment.apiBaseUrl}/profiles`;

  /**
   * Loads the current user's profile.
   */
  getCurrentProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.profilesUrl}/me`);
  }

  /**
   * Saves changes to the current user's profile.
   */
  updateCurrentProfile(request: UpdateProfileRequest): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${this.profilesUrl}/me`, request);
  }
}
