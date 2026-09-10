import {AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators} from '@angular/forms';

import {PartialAddressRequest} from '../../../shared/models/address-model';
import {normaliseOptionalText} from '../../../shared/utils/formatting';
import {AppointmentRequest} from '../models/appointment-model';

/**
 * Contains appointment values that can be loaded into the shared appointment form.
 */
export interface AppointmentFormSource {
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  service: string | null;
  appointmentType: string | null;
  clinicianOrTeam: string | null;
  locationName: string | null;
  address: PartialAddressRequest | null;
  notes: string | null;
}

/**
 * Creates the form used to enter and review appointment details.
 */
export function createAppointmentForm(formBuilder: FormBuilder) {
  return formBuilder.group({
    date: formBuilder.nonNullable.control('', Validators.required),
    startTime: formBuilder.nonNullable.control('', Validators.required),
    endTime: formBuilder.nonNullable.control(''),
    service: formBuilder.nonNullable.control('', Validators.maxLength(250)),
    appointmentType: formBuilder.nonNullable.control('', Validators.maxLength(250)),
    clinicianOrTeam: formBuilder.nonNullable.control('', Validators.maxLength(250)),
    locationName: formBuilder.nonNullable.control('', Validators.maxLength(250)),
    address: formBuilder.group({
      addressLine1: formBuilder.nonNullable.control('', Validators.maxLength(150)),
      addressLine2: formBuilder.nonNullable.control('', Validators.maxLength(150)),
      townCity: formBuilder.nonNullable.control('', Validators.maxLength(100)),
      county: formBuilder.nonNullable.control('', Validators.maxLength(100)),
      postcode: formBuilder.nonNullable.control('', Validators.maxLength(20)),
      country: formBuilder.nonNullable.control('', Validators.maxLength(100)),
    }),
    notes: formBuilder.nonNullable.control('', Validators.maxLength(2000)),
  }, {
    validators: appointmentTimeValidator,
  });
}

export type AppointmentForm = ReturnType<typeof createAppointmentForm>;

/**
 * Converts the appointment form values into the request used when saving an appointment.
 */
export function mapAppointmentFormToRequest(form: AppointmentForm): AppointmentRequest {
  const value = form.getRawValue();

  return {
    date: value.date,
    startTime: value.startTime,
    endTime: normaliseOptionalText(value.endTime),
    service: normaliseOptionalText(value.service),
    appointmentType: normaliseOptionalText(value.appointmentType),
    clinicianOrTeam: normaliseOptionalText(value.clinicianOrTeam),
    locationName: normaliseOptionalText(value.locationName),
    address: buildPartialAddressRequest(value.address),
    notes: normaliseOptionalText(value.notes),
  };
}

/**
 * Resets the appointment form using existing appointment details when they are available.
 */
export function resetAppointmentForm(form: AppointmentForm, source: AppointmentFormSource | null = null): void {
  form.reset({
    date: source?.date ?? '',
    startTime: toTimeInput(source?.startTime ?? null),
    endTime: toTimeInput(source?.endTime ?? null),
    service: source?.service ?? '',
    appointmentType: source?.appointmentType ?? '',
    clinicianOrTeam: source?.clinicianOrTeam ?? '',
    locationName: source?.locationName ?? '',
    address: {
      addressLine1: source?.address?.addressLine1 ?? '',
      addressLine2: source?.address?.addressLine2 ?? '',
      townCity: source?.address?.townCity ?? '',
      county: source?.address?.county ?? '',
      postcode: source?.address?.postcode ?? '',
      country: source?.address?.country ?? '',
    },
    notes: source?.notes ?? '',
  });
}

/**
 * Builds an address from the completed fields or returns null when the address is empty.
 */
function buildPartialAddressRequest(value: {
  addressLine1: string;
  addressLine2: string;
  townCity: string;
  county: string;
  postcode: string;
  country: string;
}): PartialAddressRequest | null {
  const address: PartialAddressRequest = {
    addressLine1: normaliseOptionalText(value.addressLine1),
    addressLine2: normaliseOptionalText(value.addressLine2),
    townCity: normaliseOptionalText(value.townCity),
    county: normaliseOptionalText(value.county),
    postcode: normaliseOptionalText(value.postcode),
    country: normaliseOptionalText(value.country),
  };

  return Object.values(address).some((field) => field !== null) ? address : null;
}

/**
 * Converts a stored time into the hours and minutes used by a time input.
 */
function toTimeInput(value: string | null): string {
  return value === null || value.length < 5 ? '' : value.substring(0, 5);
}

/**
 * Checks that the appointment end time is later than the start time when both are provided.
 */
const appointmentTimeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const startTime = control.get('startTime')?.value;
  const endTime = control.get('endTime')?.value;

  if (typeof startTime !== 'string' || startTime.length === 0 || typeof endTime !== 'string' || endTime.length === 0) {
    return null;
  }

  return endTime > startTime ? null : { endTimeAfterStart: true };
};
