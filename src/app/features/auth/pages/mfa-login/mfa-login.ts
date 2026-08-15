import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth-service';

@Component({
  selector: 'app-mfa-login',
  imports: [ReactiveFormsModule],
  templateUrl: './mfa-login.html',
})
export class MfaLogin {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly errorMessage = signal('');
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^\d{6}$/),
    ]),
  });

  protected completeLogin(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    this.authService.completeMfaLogin(this.form.controls.code.value.trim()).pipe(
      finalize(() => this.isSubmitting.set(false)),
    ).subscribe({
      next: () => void this.router.navigateByUrl(this.getReturnUrl()),
      error: (error: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(error, 'MFA verification failed.'));
      },
    });
  }

  protected cancel(): void {
    this.authService.cancelMfaLogin();
    void this.router.navigate(['/login']);
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl !== null && returnUrl.startsWith('/') ? returnUrl : '/home';
  }
}
