import { Component, inject } from '@angular/core';
import { FormsModule, NgForm} from '@angular/forms';
import { ActivatedRoute, Router} from '@angular/router';
import { finalize} from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { AuthService } from '../../../../core/services/auth-service';

@Component({
  selector: 'app-mfa-login',
  imports: [FormsModule],
  templateUrl: './mfa-login.html',
  styleUrl: './mfa-login.css',
})
export class MfaLogin {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected code = '';
  protected errorMessage = '';
  protected isSubmitting = false;


  protected completeLogin(form: NgForm): void {
    this.errorMessage = '';

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const normalizedCode = this.code.trim();

    this.isSubmitting = true;

    this.authService.completeMfaLogin(normalizedCode)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl(
            this.getReturnUrl()
          );
        },
        error: (error: unknown) => {
          this.errorMessage = getHttpErrorMessage(
            error,
            'MFA verification failed.',
          );
        },
      });
  }

  protected cancel(): void {
    this.authService.cancelMfaLogin();
    void this.router.navigate(['/login']);
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (returnUrl === null || !returnUrl.startsWith('/')) {
      return '/home';
    }

    return returnUrl;
  }


}
