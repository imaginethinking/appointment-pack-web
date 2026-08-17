import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApplicationPage, PageViewRequest } from '../models/application-page-model';

@Injectable({
  providedIn: 'root',
})
export class AnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly pageViewsUrl = `${environment.apiBaseUrl}/analytics/page-views`;

  recordPageView(page: ApplicationPage): Observable<void> {
    const request: PageViewRequest = { page };
    return this.http.post<void>(this.pageViewsUrl, request);
  }
}
