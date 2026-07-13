import {Component, inject} from '@angular/core';
import {FormsModule, NgForm} from '@angular/forms';
import {Router} from '@angular/router';
import {AuthService} from '../../../../core/services/auth-service';
import {RegisterRequest} from '../../../../core/models/auth-model';
import {finalize} from 'rxjs';
import {getHttpErrorMessage} from '../../../../core/http/http-error-message';

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  dateOfBirth = '';

  protected errorMessage = '';
  protected isSubmitting = false;



  register(form: NgForm): void {
    this.errorMessage = '';

    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const request: RegisterRequest = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
      confirmPassword: this.confirmPassword,
      dateOfBirth: this.dateOfBirth
    };

    this.isSubmitting = true;

    this.authService.register(request)
      .pipe(finalize(() => this.isSubmitting = false))
      .subscribe({
        next: () => this.router.navigate(['/login'], {
          queryParams: {
            registered: 'true'
          }
        }),
        error: (error: unknown) => getHttpErrorMessage(error, 'Registration failed')
      });
  }
}
