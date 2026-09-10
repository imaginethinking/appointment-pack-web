import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {AuthService} from '../../../../core/services/auth-service';

/**
 * Shows the public landing page and adjusts the available actions for signed in users.
 */
@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
})
export class Landing {
  private readonly authService = inject(AuthService);

  protected readonly isAuthenticated = this.authService.authenticated;
}
