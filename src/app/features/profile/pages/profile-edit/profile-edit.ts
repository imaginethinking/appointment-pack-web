import {Component, inject, OnInit, signal,} from '@angular/core';
import {FormBuilder, ReactiveFormsModule, Validators,} from '@angular/forms';
import {Router, RouterLink,} from '@angular/router';

import {applyServerFieldErrors} from '../../../../core/forms/server-field-errors';
import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {ProfileResponse} from '../../models/profile-model';
import {ProfileState} from '../../services/profile-state';

@Component({
  selector: 'app-profile-edit',
  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],
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

  protected readonly form =
    this.formBuilder.group({
      firstName:
        this.formBuilder.nonNullable.control(
          '',
          [
            Validators.required,
            Validators.maxLength(100),
          ],
        ),

      lastName:
        this.formBuilder.nonNullable.control(
          '',
          [
            Validators.required,
            Validators.maxLength(100),
          ],
        ),

      dateOfBirth:
        this.formBuilder.nonNullable.control(
          '',
          Validators.required,
        ),

      gender:
        this.formBuilder.control<string | null>(
          null,
          Validators.maxLength(50),
        ),

      hasAddress:
        this.formBuilder.nonNullable.control(
          false,
        ),

      address:
        this.formBuilder.group({
          addressLine1:
            this.formBuilder.nonNullable.control(
              '',
              Validators.maxLength(150),
            ),

          addressLine2:
            this.formBuilder.nonNullable.control(
              '',
              Validators.maxLength(150),
            ),

          townCity:
            this.formBuilder.nonNullable.control(
              '',
              Validators.maxLength(100),
            ),

          county:
            this.formBuilder.nonNullable.control(
              '',
              Validators.maxLength(100),
            ),

          postcode:
            this.formBuilder.nonNullable.control(
              '',
              Validators.maxLength(20),
            ),

          country:
            this.formBuilder.nonNullable.control(
              'United Kingdom',
              Validators.maxLength(100),
            ),
        }),
    });

  ngOnInit(): void {
    const profile = this.profileState.profile();

    if (profile !== null) {this.populateForm(profile);
      return;
    }

    this.loadProfile();
  }

  protected toggleAddress(
    event: Event,
  ): void {
    const checked =
      (event.target as HTMLInputElement)
        .checked;

    this.form.controls.hasAddress.setValue(
      checked,
    );

    this.configureAddressValidation(
      checked,
    );
  }

  protected save(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const hasAddress = value.hasAddress;

    const address = hasAddress ? {
          addressLine1:
            value.address.addressLine1.trim(),

          addressLine2:
            this.optionalText(
              value.address.addressLine2,
            ),

          townCity:
            value.address.townCity.trim(),

          county:
            this.optionalText(
              value.address.county,
            ),

          postcode:
            value.address.postcode.trim(),

          country:
            value.address.country.trim(),
        }
        : null;

    this.profileState
      .updateCurrentProfile({
        firstName:
          value.firstName.trim(),

        lastName:
          value.lastName.trim(),

        dateOfBirth:
        value.dateOfBirth,

        gender:
          this.optionalText(
            value.gender,
          ),

        address,
      })
      .subscribe({
        next: () => {
          void this.router.navigate([
            '/profile',
          ]);
        },

        error: (error: unknown) => {
          if (
            !applyServerFieldErrors(
              this.form,
              error,
            )
          ) {
            this.errorMessage.set(
              getHttpErrorMessage(
                error,
                'Unable to update your profile.',
              ),
            );
          }
        },
      });
  }

  private loadProfile(): void {
    this.errorMessage.set('');

    this.profileState
      .loadCurrentProfile()
      .subscribe({
        next: (profile) => {
          this.populateForm(profile);
        },

        error: (error: unknown) => {
          this.errorMessage.set(
            getHttpErrorMessage(
              error,
              'Unable to load your profile.',
            ),
          );
        },
      });
  }

  private populateForm(
    profile: ProfileResponse,
  ): void {
    const hasAddress =
      profile.address !== null;

    this.form.reset({
      firstName:
      profile.firstName,

      lastName:
      profile.lastName,

      dateOfBirth:
      profile.dateOfBirth,

      gender:
      profile.gender,

      hasAddress,

      address: {
        addressLine1:
          profile.address?.addressLine1 ??
          '',

        addressLine2:
          profile.address?.addressLine2 ??
          '',

        townCity:
          profile.address?.townCity ??
          '',

        county:
          profile.address?.county ??
          '',

        postcode:
          profile.address?.postcode ??
          '',

        country:
          profile.address?.country ??
          'United Kingdom',
      },
    });

    this.configureAddressValidation(
      hasAddress,
    );
  }

  private configureAddressValidation(
    enabled: boolean,
  ): void {
    const address =
      this.form.controls.address.controls;

    if (enabled) {
      address.addressLine1.setValidators([
        Validators.required,
        Validators.maxLength(150),
      ]);

      address.townCity.setValidators([
        Validators.required,
        Validators.maxLength(100),
      ]);

      address.postcode.setValidators([
        Validators.required,
        Validators.maxLength(20),
      ]);

      address.country.setValidators([
        Validators.required,
        Validators.maxLength(100),
      ]);
    } else {
      address.addressLine1.setValidators(
        Validators.maxLength(150),
      );

      address.townCity.setValidators(
        Validators.maxLength(100),
      );

      address.postcode.setValidators(
        Validators.maxLength(20),
      );

      address.country.setValidators(
        Validators.maxLength(100),
      );
    }

    address.addressLine1.updateValueAndValidity();
    address.townCity.updateValueAndValidity();
    address.postcode.updateValueAndValidity();
    address.country.updateValueAndValidity();
  }

  private optionalText(
    value: string | null,
  ): string | null {
    const trimmed =
      value?.trim() ?? '';

    return trimmed.length === 0
      ? null
      : trimmed;
  }
}
