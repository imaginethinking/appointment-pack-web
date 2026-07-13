import { Component, inject } from '@angular/core';
import {FormsModule, NgForm } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import {AuthService} from '../../../../core/services/auth-service';
import {LoginRequest} from '../../../../core/models/auth-model';


@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected email = '';
  protected password = '';

  protected errorMessage = '';
  protected isSubmitting = false;

  protected readonly registrationSuccessful = this.route.snapshot.queryParamMap.get('registered') === 'true';

  protected login(form: NgForm): void {
    this.errorMessage = '';

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const request: LoginRequest = {
      email: this.email.trim(),
      password: this.password
    };

    this.isSubmitting = true;

    this.authService.login(request)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (response) => {
          const returnUrl = this.getReturnUrl();

          if (response.mfaRequired) {
            void this.router.navigate(['/login/mfa'], {
              queryParams: {
                returnUrl
              }
            });

            return;
          }

          void this.router.navigateByUrl(returnUrl);
        },
        error: (error: unknown) => {
          this.errorMessage = getHttpErrorMessage(
            error,
            'Login failed.'
          );
        }
      });
  }

  private getReturnUrl(): string {
    const returnUrl =
      this.route.snapshot.queryParamMap.get('returnUrl');

    if (returnUrl === null || !returnUrl.startsWith('/')) {
      return '/home';
    }

    return returnUrl;
  }
}
