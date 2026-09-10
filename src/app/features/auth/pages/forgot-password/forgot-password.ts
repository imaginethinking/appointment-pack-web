import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthApiService } from '../../../../core/services/auth-api-service';

/**
 * Lets the user request a password reset using their email address.
 */
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);

  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.formBuilder.group({
    email: this.formBuilder.nonNullable.control('', [Validators.required, Validators.email, Validators.maxLength(254)]),
  });

  /**
   * Checks the email form and submits a password reset request.
   */
  protected requestReset(): void {
    this.errorMessage.set('');
    clearServerFieldErrors(this.form);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.authApi.requestPasswordReset({
      email: this.form.controls.email.value.trim(),
    }).pipe(
      finalize(() => this.isSubmitting.set(false)),
    ).subscribe({
      next: () => this.submitted.set(true),
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.form, error)) {
          return;
        }

        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to request a password reset.'));
      },
    });
  }
}
