import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth-service';
import { PageTelemetryService } from './core/services/page-telemetry-service';
import { PatientContextCoordinator } from './features/patient-context/services/patient-context-coordinator';
import { Navbar } from './shared/components/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [Navbar, RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  private readonly authService = inject(AuthService);
  private readonly pageTelemetryService = inject(PageTelemetryService);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  constructor() {
    this.pageTelemetryService.start();

    effect(() => {
      if (!this.authService.authenticated()) {
        this.patientContextCoordinator.reset();
      }
    });
  }
}
