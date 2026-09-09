import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { AddressRequest } from '../../../shared/models/address-model';
import { normaliseOptionalText } from '../../../shared/utils/formatting';
import { HealthcareContactRequest, HealthcareContactResponse } from '../models/healthcare-contact-model';

/**
 * Creates the form used to enter healthcare contact details.
 */
export function createHealthcareContactForm(formBuilder: FormBuilder) {
  return formBuilder.group({
    name: formBuilder.nonNullable.control('', [Validators.required, nonBlankValidator, Validators.maxLength(200)]),
    role: formBuilder.nonNullable.control('', Validators.maxLength(150)),
    organisation: formBuilder.nonNullable.control('', Validators.maxLength(200)),
    phoneNumber: formBuilder.nonNullable.control('', Validators.maxLength(50)),
    email: formBuilder.nonNullable.control('', [Validators.email, Validators.maxLength(254)]),
    address: formBuilder.group({
      addressLine1: formBuilder.nonNullable.control('', Validators.maxLength(150)),
      addressLine2: formBuilder.nonNullable.control('', Validators.maxLength(150)),
      townCity: formBuilder.nonNullable.control('', Validators.maxLength(100)),
      county: formBuilder.nonNullable.control('', Validators.maxLength(100)),
      postcode: formBuilder.nonNullable.control('', Validators.maxLength(20)),
      country: formBuilder.nonNullable.control('', Validators.maxLength(100)),
    }, { validators: optionalCompleteAddressValidator }),
    notes: formBuilder.nonNullable.control('', Validators.maxLength(2000)),
  });
}

export type HealthcareContactForm = ReturnType<typeof createHealthcareContactForm>;

/**
 * Converts the healthcare contact form values into the request used when saving a contact.
 */
export function mapHealthcareContactFormToRequest(form: HealthcareContactForm): HealthcareContactRequest {
  const value = form.getRawValue();

  return {
    name: value.name.trim(),
    role: normaliseOptionalText(value.role),
    organisation: normaliseOptionalText(value.organisation),
    phoneNumber: normaliseOptionalText(value.phoneNumber),
    email: normaliseOptionalText(value.email),
    address: buildAddressRequest(value.address),
    notes: normaliseOptionalText(value.notes),
  };
}

/**
 * Resets the healthcare contact form using an existing contact when one is provided.
 */
export function resetHealthcareContactForm(form: HealthcareContactForm, contact: HealthcareContactResponse | null = null): void {
  form.reset({
    name: contact?.name ?? '',
    role: contact?.role ?? '',
    organisation: contact?.organisation ?? '',
    phoneNumber: contact?.phoneNumber ?? '',
    email: contact?.email ?? '',
    address: {
      addressLine1: contact?.address?.addressLine1 ?? '',
      addressLine2: contact?.address?.addressLine2 ?? '',
      townCity: contact?.address?.townCity ?? '',
      county: contact?.address?.county ?? '',
      postcode: contact?.address?.postcode ?? '',
      country: contact?.address?.country ?? '',
    },
    notes: contact?.notes ?? '',
  });
}

/**
 * Builds the contact address when any address details have been entered.
 */
function buildAddressRequest(value: {
  addressLine1: string;
  addressLine2: string;
  townCity: string;
  county: string;
  postcode: string;
  country: string;
}): AddressRequest | null {
  const normalised = {
    addressLine1: value.addressLine1.trim(),
    addressLine2: normaliseOptionalText(value.addressLine2),
    townCity: value.townCity.trim(),
    county: normaliseOptionalText(value.county),
    postcode: value.postcode.trim(),
    country: value.country.trim(),
  };

  const hasAnyAddressValue = Object.values(value).some((field) => field.trim().length > 0);
  return hasAnyAddressValue ? normalised : null;
}

/**
 * Rejects text that contains only spaces.
 */
const nonBlankValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
};

/**
 * Allows an empty address but requires the main address fields when an address is entered.
 */
const optionalCompleteAddressValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const values = ['addressLine1', 'addressLine2', 'townCity', 'county', 'postcode', 'country'].map((name) => {
    const value = control.get(name)?.value;
    return typeof value === 'string' ? value.trim() : '';
  });

  if (values.every((value) => value.length === 0)) {
    return null;
  }

  const requiredFields = ['addressLine1', 'townCity', 'postcode', 'country'];
  const missingFields = requiredFields.filter((name) => {
    const value = control.get(name)?.value;
    return typeof value !== 'string' || value.trim().length === 0;
  });

  return missingFields.length === 0 ? null : { incompleteAddress: true };
};
