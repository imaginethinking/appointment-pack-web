import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  AdminAnalyticsSummaryResponse,
  AnalyticsRangeQuery,
  OperationalEventPageResponse,
  OperationalEventQuery,
} from '../models/admin-analytics-model';

@Injectable({
  providedIn: 'root',
})
export class AdminAnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly adminAnalyticsUrl = `${environment.apiBaseUrl}/admin/analytics`;

  getSummary(query: AnalyticsRangeQuery): Observable<AdminAnalyticsSummaryResponse> {
    return this.http.get<AdminAnalyticsSummaryResponse>(`${this.adminAnalyticsUrl}/summary`, {
      params: this.buildRangeParams(query),
    });
  }

  getEvents(query: OperationalEventQuery): Observable<OperationalEventPageResponse> {
    let params = this.buildRangeParams(query)
      .set('page', query.page.toString())
      .set('size', query.size.toString());

    if (query.category !== undefined) {
      params = params.set('category', query.category);
    }

    return this.http.get<OperationalEventPageResponse>(`${this.adminAnalyticsUrl}/events`, { params });
  }

  private buildRangeParams(query: AnalyticsRangeQuery): HttpParams {
    let params = new HttpParams();

    if (query.from !== undefined) {
      params = params.set('from', query.from);
    }

    if (query.to !== undefined) {
      params = params.set('to', query.to);
    }

    return params;
  }
}
