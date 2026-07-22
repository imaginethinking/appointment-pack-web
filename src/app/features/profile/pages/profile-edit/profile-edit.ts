import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { applyServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { ProfileState } from '../../services/profile-state';

@Component({
  selector: 'app-profile-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.css',
})
export class ProfileEdit implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileState = inject(ProfileState);
  private readonly router = inject(Router);

  protected readonly isLoading = this.profileState.isLoading;
  protected readonly isSaving = this.profileState.isSaving;
  protected readonly errorMessage = signal('');

  protected readonly form = this.formBuilder.group({
    firstName: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    lastName: this.formBuilder.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(100),
    ]),
    dateOfBirth: this.formBuilder.nonNullable.control('', Validators.required),
    gender: this.formBuilder.control<string | null>(null, Validators.maxLength(50)),
  });

  ngOnInit(): void {
    const profile = this.profileState.profile();

    if (profile !== null) {
      this.form.reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
      });

      return;
    }

    this.loadProfile();
  }

  protected save(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const gender = value.gender?.trim() || null;

    this.profileState
      .updateCurrentProfile({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        dateOfBirth: value.dateOfBirth,
        gender,
      })
      .subscribe({
        next: () => {
          void this.router.navigate(['/profile']);
        },
        error: (error: unknown) => {
          if (!applyServerFieldErrors(this.form, error)) {
            this.errorMessage.set(getHttpErrorMessage(error, 'Unable to update your profile.'));
          }
        },
      });
  }

  private loadProfile(): void {
    this.errorMessage.set('');

    this.profileState.loadCurrentProfile().subscribe({
      next: (profile) => {
        this.form.reset({
          firstName: profile.firstName,
          lastName: profile.lastName,
          dateOfBirth: profile.dateOfBirth,
          gender: profile.gender,
        });
      },
      error: (error: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load your profile.'));
      },
    });
  }
}
