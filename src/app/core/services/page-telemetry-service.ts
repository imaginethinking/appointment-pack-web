import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { ApplicationPage } from '../models/application-page-model';
import { AnalyticsApiService } from './analytics-api-service';
import { AuthService } from './auth-service';

interface PageRouteMapping {
  routePrefix: string;
  page: ApplicationPage;
  exact?: boolean;
  authenticatedOnly?: boolean;
}

const PAGE_ROUTE_MAPPINGS: readonly PageRouteMapping[] = [
  { routePrefix: '/', page: 'LANDING', exact: true, authenticatedOnly: false },
  { routePrefix: '/home', page: 'DASHBOARD' },
  { routePrefix: '/patient', page: 'PATIENT_RECORD' },
  { routePrefix: '/documents', page: 'DOCUMENTS' },
  { routePrefix: '/appointments', page: 'APPOINTMENTS' },
  { routePrefix: '/medications', page: 'MEDICATIONS' },
  { routePrefix: '/medical-history', page: 'MEDICAL_HISTORY' },
  { routePrefix: '/blood-results', page: 'BLOOD_RESULTS' },
  { routePrefix: '/contacts', page: 'CONTACTS' },
  { routePrefix: '/appointment-packs', page: 'APPOINTMENT_PACKS' },
  { routePrefix: '/activity-history', page: 'ACTIVITY_HISTORY' },
  { routePrefix: '/care-network', page: 'CARER_NETWORK' },
  { routePrefix: '/profile', page: 'PROFILE' },
];

@Injectable({
  providedIn: 'root',
})
export class PageTelemetryService {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly analyticsApi = inject(AnalyticsApiService);
  private started = false;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ).subscribe((event) => {
      const mapping = this.resolvePage(event.urlAfterRedirects);

      if (mapping === null) {
        return;
      }

      if (mapping.authenticatedOnly !== false && !this.authService.authenticated()) {
        return;
      }

      this.analyticsApi.recordPageView(mapping.page).subscribe({
        error: () => {
          // Telemetry is best-effort and must never block or alter navigation.
        },
      });
    });
  }

  private resolvePage(url: string): PageRouteMapping | null {
    const path = url.split('?')[0].split('#')[0];

    return PAGE_ROUTE_MAPPINGS.find((mapping) => {
      if (mapping.exact) {
        return path === mapping.routePrefix;
      }

      return path === mapping.routePrefix || path.startsWith(`${mapping.routePrefix}/`);
    }) ?? null;
  }
}
