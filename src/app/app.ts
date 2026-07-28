import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AuthService } from './core/services/auth-service';
import { PatientContextCoordinator } from './features/patient-context/services/patient-context-coordinator';
import { Navbar } from './shared/components/navbar/navbar';

@Component({
  selector: 'app-root',
  imports: [Navbar, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly authService = inject(AuthService);

  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  constructor() {
    effect(() => {
      if (!this.authService.authenticated()) {
        this.patientContextCoordinator.reset();
      }
    });
  }
}
