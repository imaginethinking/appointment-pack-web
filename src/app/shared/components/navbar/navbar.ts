import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService} from '../../../core/services/auth-service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected mobileMenuOpen = false;
  protected profileMenuOpen = false;

  protected isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
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
