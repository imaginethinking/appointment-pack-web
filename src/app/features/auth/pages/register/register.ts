import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { matchingControlsValidator, pastDateValidator, strongPasswordValidator } from '../../../../core/forms/auth-validators';
import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { RegisterRequest } from '../../../../core/models/auth-model';
import { AuthApiService } from '../../../../core/services/auth-api-service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);

  protected errorMessage = '';
  protected isSubmitting = false;

  protected readonly form = this.formBuilder.group({
    firstName: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    lastName: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    email: this.formBuilder.nonNullable.control('', [Validators.required, Validators.email, Validators.maxLength(254)]),
    dateOfBirth: this.formBuilder.nonNullable.control('', [Validators.required, pastDateValidator]),
    password: this.formBuilder.nonNullable.control('', [Validators.required, strongPasswordValidator]),
    confirmPassword: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(128)]),
  }, {
    validators: matchingControlsValidator('password', 'confirmPassword', 'passwordMismatch'),
  });

  protected register(): void {
    this.errorMessage = '';
    clearServerFieldErrors(this.form);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: RegisterRequest = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      dateOfBirth: value.dateOfBirth,
      password: value.password,
      confirmPassword: value.confirmPassword,
    };

    this.isSubmitting = true;

    this.authApi.register(request).pipe(
      finalize(() => this.isSubmitting = false),
    ).subscribe({
      next: (response) => {
        if (response.emailVerificationRequired) {
          void this.router.navigate(['/verify-email'], {
            queryParams: {
              email: response.email,
            },
          });
          return;
        }

        void this.router.navigate(['/login']);
      },
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.form, error)) {
          return;
        }

        if (hasHttpStatus(error, 409)) {
          this.errorMessage = 'An account already exists for that email address.';
          return;
        }

        this.errorMessage = getHttpErrorMessage(error, 'Registration failed.');
      },
    });
  }
}
