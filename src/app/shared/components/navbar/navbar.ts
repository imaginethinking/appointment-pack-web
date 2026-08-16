import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Permission } from '../../../core/models/permission-model';
import { AuthService } from '../../../core/services/auth-service';
import { PatientContextAuthorisation } from '../../../features/patient-context/services/patient-context-auth';
import { SelectedPatientState } from '../../../features/patient-context/services/selected-patient-state';
import { PatientContextSelector } from '../patient-context-selector/patient-context-selector';

interface NavigationItem {
  label: string;
  route: string;
  permission?: Permission;
  exact?: boolean;
}

const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    label: 'Dashboard',
    route: '/home',
    exact: true,
  },
  {
    label: 'Patient Record',
    route: '/patient',
    permission: 'patient-record:view',
  },
  {
    label: 'Documents',
    route: '/documents',
    permission: 'document:view',
  },
  {
    label: 'Appointments',
    route: '/appointments',
    permission: 'appointment:view',
  },
  {
    label: 'Medications',
    route: '/medications',
    permission: 'medication:view',
  },
  {
    label: 'Contacts',
    route: '/contacts',
    permission: 'contact:view',
  },
  {
    label: 'Blood Results',
    route: '/blood-results',
    permission: 'blood-result:view',
  },
  {
    label: 'Medical History',
    route: '/medical-history',
    permission: 'history:view',
  },
  {
    label: 'Care Network',
    route: '/care-network',
  },
];

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, PatientContextSelector],
  templateUrl: './navbar.html',
})
export class Navbar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);

  protected readonly isAuthenticated = this.authService.authenticated;
  protected readonly navigationItems = NAVIGATION_ITEMS;

  protected mobileMenuOpen = false;
  protected profileMenuOpen = false;

  protected canViewNavigationItem(item: NavigationItem): boolean {
    return item.permission === undefined || this.authorisation.has(this.selectedPatientState.selectedPatient(), item.permission);
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
