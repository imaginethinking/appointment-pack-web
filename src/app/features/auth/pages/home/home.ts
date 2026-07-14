import {Component, inject} from '@angular/core';
import {AuthService} from '../../../../core/services/auth-service';
import {Router, RouterLink} from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected isMfaEnabled(): boolean {
    return this.authService.isMfaEnabled();
  }

  protected logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
