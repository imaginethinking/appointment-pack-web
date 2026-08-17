import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { ApplicationPage } from '../models/application-page-model';
import { AnalyticsApiService } from './analytics-api-service';
import { AuthService } from './auth-service';

interface PageRouteMapping {
  routePrefix: string;
  page: ApplicationPage;
}

const PAGE_ROUTE_MAPPINGS: readonly PageRouteMapping[] = [
  { routePrefix: '/home', page: 'DASHBOARD' },
  { routePrefix: '/documents', page: 'DOCUMENTS' },
  { routePrefix: '/appointments', page: 'APPOINTMENTS' },
  { routePrefix: '/medications', page: 'MEDICATIONS' },
  { routePrefix: '/medical-history', page: 'MEDICAL_HISTORY' },
  { routePrefix: '/blood-results', page: 'BLOOD_RESULTS' },
  { routePrefix: '/contacts', page: 'CONTACTS' },
  { routePrefix: '/appointment-packs', page: 'APPOINTMENT_PACKS' },
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
      if (!this.authService.authenticated()) {
        return;
      }

      const page = this.resolvePage(event.urlAfterRedirects);

      if (page === null) {
        return;
      }

      this.analyticsApi.recordPageView(page).subscribe({
        error: () => {
          // Telemetry is best-effort and must never block or alter navigation.
        },
      });
    });
  }

  private resolvePage(url: string): ApplicationPage | null {
    const path = url.split('?')[0].split('#')[0];

    const mapping = PAGE_ROUTE_MAPPINGS.find(({ routePrefix }) =>
      path === routePrefix || path.startsWith(`${routePrefix}/`),
    );

    return mapping?.page ?? null;
  }
}
