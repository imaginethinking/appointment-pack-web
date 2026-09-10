import {Component, inject} from '@angular/core';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';

import {Permission} from '../../../core/models/permission-model';
import {AuthService} from '../../../core/services/auth-service';
import {PatientContextAuthorisation} from '../../../features/patient-context/services/patient-context-auth';
import {SelectedPatientState} from '../../../features/patient-context/services/selected-patient-state';
import {PatientContextSelector} from '../patient-context-selector/patient-context-selector';

/**
 * Describes a link shown in the main navigation.
 */
interface NavigationItem {
  label: string;
  route: string;
  permission?: Permission;
  exact?: boolean;
}

/**
 * Groups related navigation links under one menu.
 */
interface NavigationGroup {
  key: NavigationGroupKey;
  label: string;
  items: readonly NavigationItem[];
}

type NavigationGroupKey = 'appointments' | 'health-record' | 'care';

const DASHBOARD_ITEM: NavigationItem = {
  label: 'Dashboard',
  route: '/home',
  exact: true,
};

const APPOINTMENT_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    label: 'Appointments',
    route: '/appointments',
    permission: 'appointment:view',
  },
  {
    label: 'Documents',
    route: '/documents',
    permission: 'document:view',
  },
  {
    label: 'Appointment Packs',
    route: '/appointment-packs',
    permission: 'appointment-pack:view',
  },
];

const HEALTH_RECORD_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    label: 'Patient Record',
    route: '/patient',
    permission: 'patient-record:view',
  },
  {
    label: 'Medications',
    route: '/medications',
    permission: 'medication:view',
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
    label: 'Contacts',
    route: '/contacts',
    permission: 'contact:view',
  },
];

const CARE_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  {
    label: 'Care Network',
    route: '/care-network',
  },
  {
    label: 'Activity History',
    route: '/activity-history',
    permission: 'audit:view',
  },
];

const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  {
    key: 'appointments',
    label: 'Appointments',
    items: APPOINTMENT_NAVIGATION_ITEMS,
  },
  {
    key: 'health-record',
    label: 'Health Record',
    items: HEALTH_RECORD_NAVIGATION_ITEMS,
  },
  {
    key: 'care',
    label: 'Care',
    items: CARE_NAVIGATION_ITEMS,
  },
];

const MOBILE_NAVIGATION_ITEMS: readonly NavigationItem[] = [
  DASHBOARD_ITEM,
  ...APPOINTMENT_NAVIGATION_ITEMS,
  ...HEALTH_RECORD_NAVIGATION_ITEMS,
  ...CARE_NAVIGATION_ITEMS,
];

/**
 * Provides the main desktop and mobile navigation for the application.
 */
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
  protected readonly isAdmin = this.authService.isAdmin;
  protected readonly dashboardItem = DASHBOARD_ITEM;
  protected readonly navigationGroups = NAVIGATION_GROUPS;
  protected readonly mobileNavigationItems = MOBILE_NAVIGATION_ITEMS;

  protected mobileMenuOpen = false;
  protected profileMenuOpen = false;
  protected openNavigationGroup: NavigationGroupKey | null = null;

  /**
   * Checks whether a navigation item can be shown for the selected patient.
   */
  protected canViewNavigationItem(item: NavigationItem): boolean {
    return item.permission === undefined
      || this.authorisation.has(this.selectedPatientState.selectedPatient(), item.permission);
  }

  /**
   * Checks whether a navigation group contains at least one visible item.
   */
  protected canViewNavigationGroup(group: NavigationGroup): boolean {
    return group.items.some((item) => this.canViewNavigationItem(item));
  }

  /**
   * Checks whether the requested navigation group is currently open.
   */
  protected isNavigationGroupOpen(group: NavigationGroup): boolean {
    return this.openNavigationGroup === group.key;
  }

  /**
   * Checks whether the current page belongs to a visible item in the navigation group.
   */
  protected isNavigationGroupActive(group: NavigationGroup): boolean {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];

    return group.items
      .filter((item) => this.canViewNavigationItem(item))
      .some((item) => currentUrl === item.route || currentUrl.startsWith(`${item.route}/`));
  }

  /**
   * Opens or closes a desktop navigation group and closes the other menus.
   */
  protected toggleNavigationGroup(group: NavigationGroup): void {
    this.openNavigationGroup = this.openNavigationGroup === group.key ? null : group.key;
    this.mobileMenuOpen = false;
    this.profileMenuOpen = false;
  }

  /**
   * Opens or closes the mobile navigation menu.
   */
  protected toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.profileMenuOpen = false;
    this.openNavigationGroup = null;
  }

  /**
   * Opens or closes the profile menu.
   */
  protected toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
    this.mobileMenuOpen = false;
    this.openNavigationGroup = null;
  }

  /**
   * Closes all open navigation menus.
   */
  protected closeMenus(): void {
    this.mobileMenuOpen = false;
    this.profileMenuOpen = false;
    this.openNavigationGroup = null;
  }

  /**
   * Signs the user out closes the menus and returns to the login page.
   */
  protected logout(): void {
    this.authService.logout();
    this.closeMenus();
    void this.router.navigate(['/login']);
  }
}
