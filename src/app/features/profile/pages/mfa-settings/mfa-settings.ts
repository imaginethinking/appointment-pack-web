import {Component, inject, signal,} from '@angular/core';
import {FormsModule, NgForm,} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QrCodeComponent } from 'ng-qrcode';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth-service';

@Component({
  selector: 'app-mfa-settings',
  imports: [
    FormsModule,
    RouterLink,
    QrCodeComponent
  ],
  templateUrl: './mfa-settings.html',
  styleUrl: './mfa-settings.css',
})
export class MfaSettings {
  private readonly authService = inject(AuthService);

  protected readonly provisioningUri = signal<string | null>(null);

  protected readonly mfaEnabled = signal(this.authService.isMfaEnabled(),);

  protected readonly isStartingSetup = signal(false);
  protected readonly isConfirming = signal(false);

  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');

  protected code = '';

  protected startSetup(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
    this.isStartingSetup.set(true);

    this.authService.setupMfa()
      .pipe(finalize(() => {
          this.isStartingSetup.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.provisioningUri.set(response.provisioningUri);
        },
        error: (error: unknown) => {
          this.errorMessage.set(getHttpErrorMessage(error, 'MFA setup failed.')
          );
        },
      });
  }

  protected confirmMfa(form: NgForm): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (form.invalid || this.provisioningUri() === null) {
      form.control.markAllAsTouched();
      return;
    }

    this.isConfirming.set(true);

    this.authService.confirmMfa(this.code.trim())
      .pipe(finalize(() => {
          this.isConfirming.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.mfaEnabled.set(true);
          this.provisioningUri.set(null);
          this.code = '';

          this.successMessage.set('Multi factor authentication has been enabled.');
        },
        error: (error: unknown) => {
          this.errorMessage.set(getHttpErrorMessage(error, 'MFA confirmation failed.')
          );
        }
      });
  }
}
