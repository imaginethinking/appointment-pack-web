import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthApiService } from '../../../../core/services/auth-api-service';

type VerificationState = 'pending' | 'confirming' | 'confirmed' | 'failed';

@Component({
  selector: 'app-verify-email',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verify-email.html',
})
export class VerifyEmail implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authApi = inject(AuthApiService);

  protected readonly state = signal<VerificationState>('pending');
  protected readonly errorMessage = signal('');
  protected readonly resendMessage = signal('');
  protected readonly isResending = signal(false);

  protected readonly returnUrl = this.getReturnUrl();

  protected readonly resendForm = this.formBuilder.group({
    email: this.formBuilder.nonNullable.control(this.route.snapshot.queryParamMap.get('email') ?? '', [
      Validators.required,
      Validators.email,
      Validators.maxLength(254),
    ]),
  });

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (token !== null && token.length > 0) {
      this.confirmVerification(token);
    }
  }

  protected resend(): void {
    this.errorMessage.set('');
    this.resendMessage.set('');
    clearServerFieldErrors(this.resendForm);

    if (this.resendForm.invalid) {
      this.resendForm.markAllAsTouched();
      return;
    }

    this.isResending.set(true);

    this.authApi.resendEmailVerification({
      email: this.resendForm.controls.email.value.trim(),
    }).pipe(
      finalize(() => this.isResending.set(false)),
    ).subscribe({
      next: () => {
        this.resendMessage.set('If the account requires verification, another verification email will be sent.');
      },
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.resendForm, error)) {
          return;
        }

        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to request another verification email.'));
      },
    });
  }

  private confirmVerification(token: string): void {
    this.state.set('confirming');
    this.errorMessage.set('');

    this.authApi.confirmEmailVerification({ token }).subscribe({
      next: () => this.state.set('confirmed'),
      error: (error: unknown) => {
        this.state.set('failed');
        this.errorMessage.set(getHttpErrorMessage(error, 'The verification link is invalid or has expired.'));
      },
    });
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl !== null && returnUrl.startsWith('/') ? returnUrl : '/home';
  }
}
