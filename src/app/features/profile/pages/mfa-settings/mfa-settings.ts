import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QrCodeComponent } from 'ng-qrcode';
import { finalize } from 'rxjs';

import { matchingControlsValidator, strongPasswordValidator } from '../../../../core/forms/auth-validators';
import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { AuthService } from '../../../../core/services/auth-service';

/**
 * Manages password changes and multi factor authentication settings for the current account.
 */
@Component({
  selector: 'app-mfa-settings',
  imports: [ReactiveFormsModule, QrCodeComponent],
  templateUrl: './mfa-settings.html',
})
export class MfaSettings implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  protected readonly mfaEnabled = signal(false);
  protected readonly provisioningUri = signal<string | null>(null);
  protected readonly isStartingSetup = signal(false);
  protected readonly isConfirmingSetup = signal(false);
  protected readonly isDisablingMfa = signal(false);
  protected readonly isChangingPassword = signal(false);
  protected readonly pageErrorMessage = signal('');
  protected readonly mfaSuccessMessage = signal('');
  protected readonly mfaErrorMessage = signal('');
  protected readonly passwordSuccessMessage = signal('');
  protected readonly passwordErrorMessage = signal('');

  protected readonly setupForm = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^\d{6}$/),
    ]),
  });

  protected readonly disableMfaForm = this.formBuilder.group({
    code: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.pattern(/^\d{6}$/),
    ]),
  });

  protected readonly passwordForm = this.formBuilder.group({
    currentPassword: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(128),
    ]),
    newPassword: this.formBuilder.nonNullable.control('', [
      Validators.required,
      strongPasswordValidator,
    ]),
    confirmPassword: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(128),
    ]),
  }, {
    validators: matchingControlsValidator('newPassword', 'confirmPassword', 'passwordMismatch'),
  });

  /**
   * Loads the current account security settings when the page opens.
   */
  ngOnInit(): void {
    this.loadSecurityStatus();
  }

  /**
   * Loads the current MFA status and resets any setup details from an earlier attempt.
   */
  protected loadSecurityStatus(): void {
    this.status.set('loading');
    this.pageErrorMessage.set('');

    this.authService.getAccountSecurity().subscribe({
      next: (security) => {
        this.mfaEnabled.set(security.mfaEnabled);
        this.provisioningUri.set(null);
        this.setupForm.reset({ code: '' });
        this.disableMfaForm.reset({ code: '' });
        this.status.set('ready');
      },
      error: (error: unknown) => {
        this.status.set('error');
        this.pageErrorMessage.set(getHttpErrorMessage(error, 'Unable to load your account security settings.'));
      },
    });
  }

  /**
   * Starts MFA setup and stores the provisioning details shown to the user.
   */
  protected startSetup(): void {
    this.clearMfaMessages();
    this.isStartingSetup.set(true);

    this.authService.setupMfa().pipe(
      finalize(() => this.isStartingSetup.set(false)),
    ).subscribe({
      next: (response) => {
        this.setupForm.reset({ code: '' });
        this.provisioningUri.set(response.provisioningUri);
      },
      error: (error: unknown) => {
        if (hasHttpStatus(error, 409)) {
          this.loadSecurityStatus();
          this.mfaErrorMessage.set('Multi-factor authentication is already enabled for this account.');
          return;
        }

        this.mfaErrorMessage.set(getHttpErrorMessage(error, 'Unable to start multi-factor authentication setup.'));
      },
    });
  }

  /**
   * Cancels the current MFA setup and clears the entered code.
   */
  protected cancelSetup(): void {
    this.provisioningUri.set(null);
    this.setupForm.reset({ code: '' });
    this.clearMfaMessages();
  }

  /**
   * Confirms MFA setup using the six digit code entered by the user.
   */
  protected confirmMfa(): void {
    this.clearMfaMessages();
    clearServerFieldErrors(this.setupForm);

    if (this.setupForm.invalid || this.provisioningUri() === null) {
      this.setupForm.markAllAsTouched();
      return;
    }

    this.isConfirmingSetup.set(true);

    this.authService.confirmMfa(this.setupForm.controls.code.value.trim()).pipe(
      finalize(() => this.isConfirmingSetup.set(false)),
    ).subscribe({
      next: () => {
        this.mfaEnabled.set(true);
        this.provisioningUri.set(null);
        this.setupForm.reset({ code: '' });
        this.mfaSuccessMessage.set('Multi-factor authentication is now enabled.');
      },
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.setupForm, error)) {
          return;
        }

        this.mfaErrorMessage.set(getHttpErrorMessage(error, 'Unable to confirm the authentication code.'));
      },
    });
  }

  /**
   * Disables MFA using the six digit code entered by the user.
   */
  protected disableMfa(): void {
    this.clearMfaMessages();
    clearServerFieldErrors(this.disableMfaForm);

    if (this.disableMfaForm.invalid || !this.mfaEnabled()) {
      this.disableMfaForm.markAllAsTouched();
      return;
    }

    this.isDisablingMfa.set(true);

    this.authService.disableMfa(this.disableMfaForm.controls.code.value.trim()).pipe(
      finalize(() => this.isDisablingMfa.set(false)),
    ).subscribe({
      next: () => {
        this.mfaEnabled.set(false);
        this.provisioningUri.set(null);
        this.disableMfaForm.reset({ code: '' });
        this.setupForm.reset({ code: '' });
        this.mfaSuccessMessage.set('Multi-factor authentication is now disabled. You can set it up again at any time.');
      },
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.disableMfaForm, error)) {
          return;
        }

        if (hasHttpStatus(error, 409)) {
          this.loadSecurityStatus();
          this.mfaErrorMessage.set('Multi-factor authentication is no longer enabled for this account.');
          return;
        }

        this.mfaErrorMessage.set(getHttpErrorMessage(error, 'Unable to disable multi-factor authentication.'));
      },
    });
  }

  /**
   * Validates and submits the password change form.
   */
  protected changePassword(): void {
    this.passwordSuccessMessage.set('');
    this.passwordErrorMessage.set('');
    clearServerFieldErrors(this.passwordForm);

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const value = this.passwordForm.getRawValue();
    this.isChangingPassword.set(true);

    this.authService.changePassword(value).pipe(
      finalize(() => this.isChangingPassword.set(false)),
    ).subscribe({
      next: () => {
        this.passwordForm.reset({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        this.passwordSuccessMessage.set('Your password has been changed.');
      },
      error: (error: unknown) => {
        if (applyServerFieldErrors(this.passwordForm, error)) {
          return;
        }

        this.passwordErrorMessage.set(getHttpErrorMessage(error, 'Unable to change your password.'));
      },
    });
  }

  /**
   * Clears the current MFA success and error messages.
   */
  private clearMfaMessages(): void {
    this.mfaSuccessMessage.set('');
    this.mfaErrorMessage.set('');
  }
}
