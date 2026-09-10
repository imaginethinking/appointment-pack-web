import {Component, inject, signal} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {finalize} from 'rxjs';

import {applyServerFieldErrors, clearServerFieldErrors} from '../../../../core/forms/server-field-errors';
import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {LoginRequest} from '../../../../core/models/auth-model';
import {AuthService} from '../../../../core/services/auth-service';

/**
 * Handles password login and directs the user to the next step required for their account.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly passwordResetSuccessful = this.route.snapshot.queryParamMap.get('passwordReset') === 'true';

  protected readonly form = this.formBuilder.group({
    email: this.formBuilder.nonNullable.control('', [Validators.required, Validators.email, Validators.maxLength(254)]),
    password: this.formBuilder.nonNullable.control('', Validators.required),
  });

  /**
   * Checks the login form and continues with the response returned for the account.
   */
  protected login(): void {
    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: LoginRequest = {
      email: value.email.trim(),
      password: value.password,
    };

    this.isSubmitting.set(true);

    this.authService.login(request).pipe(
      finalize(() => this.isSubmitting.set(false)),
    ).subscribe({
      next: (response) => {
        const returnUrl = this.getReturnUrl();

        switch (response.status) {
          case 'AUTHENTICATED':
            void this.router.navigateByUrl(returnUrl);
            return;
          case 'EMAIL_VERIFICATION_REQUIRED':
            void this.router.navigate(['/verify-email'], {
              queryParams: {
                email: request.email,
                returnUrl,
              },
            });
            return;
          case 'MFA_REQUIRED':
            void this.router.navigate(['/login/mfa'], {
              queryParams: {
                returnUrl,
              },
            });
            return;
        }
      },
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.form, error)) {
          return;
        }

        this.errorMessage.set(getHttpErrorMessage(error, 'Login failed.'));
      },
    });
  }

  /**
   * Returns the requested page after login or uses the home page when no valid return path is supplied.
   */
  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl !== null && returnUrl.startsWith('/') ? returnUrl : '/home';
  }
}
