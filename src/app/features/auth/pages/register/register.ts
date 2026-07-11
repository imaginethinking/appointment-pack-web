import { Component } from '@angular/core';
import { UserService } from '../../../../core/services/user.service';
import { CreateUserRequest } from '../../../../core/models/user.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  dateOfBirth = '';

  message: string = '';

  constructor(private readonly userService: UserService) {}

  register(): void {
    const request: CreateUserRequest = {
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      password: this.password,
      dateOfBirth: this.dateOfBirth,
      role: 'PATIENT',
    };

    this.userService.createUser(request).subscribe({
      next: (response) => {
        this.message = `User Created: ${response.email}`;
      },
      error: (error) => {
        this.message = `Error: ${error.message}`;
      },
    });
  }
}
