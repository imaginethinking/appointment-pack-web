import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { ProfileState } from '../../services/profile-state';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private readonly profileState = inject(ProfileState);

  protected readonly profile = this.profileState.profile;
  protected readonly isLoading = this.profileState.isLoading;
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    if (this.profile() === null) {
      this.loadProfile();
    }
  }

  protected loadProfile(): void {
    this.errorMessage.set('');

    this.profileState.loadCurrentProfile().subscribe({
      error: (error: unknown) => {
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load your profile.'));
      },
    });
  }
}
