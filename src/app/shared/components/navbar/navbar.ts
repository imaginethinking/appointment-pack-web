import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../../core/services/auth-service';
import {
  SelectedPatientContext,
  getPatientContextName,
} from '../../../features/patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../features/patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../features/patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../features/patient-context/services/selected-patient-state';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  private readonly selectedPatientState = inject(SelectedPatientState);

  private readonly authorisation = inject(PatientContextAuthorisation);

  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly isAuthenticated = this.authService.authenticated;

  protected readonly patientContexts = this.selectedPatientState.contexts;

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;

  protected readonly selectedPatientRecordId = this.selectedPatientState.selectedPatientRecordId;

  protected readonly isPatientContextLoading = this.patientContextCoordinator.isLoading;

  protected readonly patientContextLoadFailed = this.patientContextCoordinator.loadFailed;

  protected mobileMenuOpen = false;
  protected profileMenuOpen = false;

  protected canViewPatientRecord(): boolean {
    return this.authorisation.can(this.selectedPatient(), 'patient-record', 'view');
  }

  protected canSelectPatient(context: SelectedPatientContext): boolean {
    return this.selectedPatientState.canSelect(context);
  }

  protected patientContextLabel(context: SelectedPatientContext): string {
    const relationshipLabel = context.contextType === 'SELF' ? 'Your record' : 'Carer access';

    return `${getPatientContextName(context)} — ${relationshipLabel}`;
  }

  protected selectPatient(event: Event): void {
    const patientRecordId = (event.target as HTMLSelectElement).value;

    if (patientRecordId.length === 0) {
      return;
    }

    this.selectedPatientState.selectPatient(patientRecordId);
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.profileMenuOpen = false;
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
    this.mobileMenuOpen = false;
  }

  protected closeMenus(): void {
    this.mobileMenuOpen = false;
    this.profileMenuOpen = false;
  }

  protected logout(): void {
    this.authService.logout();
    this.closeMenus();

    void this.router.navigate(['/login']);
  }
}
