import {DOCUMENT} from '@angular/common';
import {Component, effect, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';

import {AuthService} from './core/services/auth-service';
import {PageTelemetryService} from './core/services/page-telemetry-service';
import {PatientContextCoordinator} from './features/patient-context/services/patient-context-coordinator';
import {Navbar} from './shared/components/navbar/navbar';

/**
 * Hosts the main application layout and loads shared patient context for signed in sessions.
 */
@Component({
  selector: 'app-root',
  imports: [Navbar, RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly authService = inject(AuthService);
  private readonly pageTelemetryService = inject(PageTelemetryService);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  /**
   * Starts page analytics and keeps patient context in sync with the current session.
   */
  constructor() {
    this.pageTelemetryService.start();

    effect((onCleanup) => {
      if (!this.authService.authenticated()) {
        this.patientContextCoordinator.reset();
        return;
      }

      const subscription = this.patientContextCoordinator.load().subscribe({
        error: () => {
          // Patient-context load errors are exposed through coordinator state.
        },
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Moves keyboard focus to the current page content without changing the current route.
   */
  protected skipToMainContent(event: Event): void {
    event.preventDefault();
    this.document.getElementById('main-content')?.focus();
  }
}
