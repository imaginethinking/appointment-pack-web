import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';

import {AuthService} from '../../../../core/services/auth-service';

/**
 * Shows the not found page with navigation suited to the current session.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
})
export class NotFound {
  private readonly authService = inject(AuthService);

  protected readonly isAuthenticated = this.authService.authenticated;
}
