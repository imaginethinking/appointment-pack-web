import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QrCodeComponent } from 'ng-qrcode';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { AuthService } from '../../../../core/services/auth-service';

@Component({
  selector: 'app-mfa-settings',
  imports: [ReactiveFormsModule, QrCodeComponent],
  templateUrl: './mfa-settings.html',
})
export class MfaSettings {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly provisioningUri = signal<string | null>(null);
  protected readonly mfaEnabled = signal(this.authService.isMfaEnabled());
  protected readonly isStartingSetup = signal(false);
  protected readonly isConfirming = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected readonly form = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^\d{6}$/),
    ]),
  });

  protected startSetup(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.isStartingSetup.set(true);

    this.authService.setupMfa().pipe(
      finalize(() => this.isStartingSetup.set(false)),
    ).subscribe({
      next: (response) => this.provisioningUri.set(response.provisioningUri),
      error: (error: unknown) => {
        if (hasHttpStatus(error, 409)) {
          this.mfaEnabled.set(true);
          this.provisioningUri.set(null);
          this.errorMessage.set('Multi-factor authentication is already enabled.');
          return;
        }

        this.errorMessage.set(getHttpErrorMessage(error, 'MFA setup failed.'));
      },
    });
  }

  protected cancelSetup(): void {
    this.provisioningUri.set(null);
    this.form.reset({ code: '' });
    this.errorMessage.set('');
  }

  protected confirmMfa(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.form.invalid || this.provisioningUri() === null) {
      this.form.markAllAsTouched();
      return;
    }

    this.isConfirming.set(true);

    this.authService.confirmMfa(this.form.controls.code.value.trim()).pipe(
      finalize(() => this.isConfirming.set(false)),
    ).subscribe({
      next: () => {
        this.mfaEnabled.set(true);
        this.provisioningUri.set(null);
        this.form.reset({ code: '' });
        this.successMessage.set('Multi-factor authentication has been enabled.');
      },
      error: (error: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(error, 'MFA confirmation failed.'));
      },
    });
  }
}
