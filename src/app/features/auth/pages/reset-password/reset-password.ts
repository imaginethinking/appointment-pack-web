import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { matchingControlsValidator, strongPasswordValidator } from '../../../../core/forms/auth-validators';
import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthApiService } from '../../../../core/services/auth-api-service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);

  private readonly token = this.route.snapshot.queryParamMap.get('token');

  protected readonly hasToken = this.token !== null && this.token.length > 0 && this.token.length <= 256;
  protected errorMessage = '';
  protected isSubmitting = false;

  protected readonly form = this.formBuilder.group({
    newPassword: this.formBuilder.nonNullable.control('', [Validators.required, strongPasswordValidator]),
    confirmPassword: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(128)]),
  }, {
    validators: matchingControlsValidator('newPassword', 'confirmPassword', 'passwordMismatch'),
  });

  protected resetPassword(): void {
    this.errorMessage = '';
    clearServerFieldErrors(this.form);

    if (!this.hasToken) {
      this.errorMessage = 'The password-reset link is invalid.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.isSubmitting = true;

    this.authApi.confirmPasswordReset({
      token: this.token!,
      newPassword: value.newPassword,
      confirmPassword: value.confirmPassword,
    }).pipe(
      finalize(() => this.isSubmitting = false),
    ).subscribe({
      next: () => {
        void this.router.navigate(['/login'], {
          queryParams: {
            passwordReset: 'true',
          },
        });
      },
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.form, error)) {
          return;
        }

        this.errorMessage = getHttpErrorMessage(error, 'The password-reset link is invalid or has expired.');
      },
    });
  }
}
