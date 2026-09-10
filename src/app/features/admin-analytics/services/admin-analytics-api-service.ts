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

/**
 * Loads summary analytics and operational events for the admin pages.
 */
@Injectable({
  providedIn: 'root',
})
export class AdminAnalyticsApiService {
  private readonly http = inject(HttpClient);
  private readonly adminAnalyticsUrl = `${environment.apiBaseUrl}/admin/analytics`;

  /**
   * Loads the analytics summary for the selected date range.
   */
  getSummary(query: AnalyticsRangeQuery): Observable<AdminAnalyticsSummaryResponse> {
    return this.http.get<AdminAnalyticsSummaryResponse>(`${this.adminAnalyticsUrl}/summary`, {
      params: this.buildRangeParams(query),
    });
  }

  /**
   * Loads a page of operational events using the selected filters.
   */
  getEvents(query: OperationalEventQuery): Observable<OperationalEventPageResponse> {
    let params = this.buildRangeParams(query)
      .set('page', query.page.toString())
      .set('size', query.size.toString());

    if (query.category !== undefined) {
      params = params.set('category', query.category);
    }

    return this.http.get<OperationalEventPageResponse>(`${this.adminAnalyticsUrl}/events`, { params });
  }

  /**
   * Adds any selected date range values to the request parameters.
   */
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
