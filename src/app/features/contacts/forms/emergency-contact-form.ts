import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { normaliseOptionalText } from '../../../shared/utils/formatting';
import { EmergencyContactRequest, EmergencyContactResponse } from '../models/emergency-contact-model';

export function createEmergencyContactForm(formBuilder: FormBuilder) {
  return formBuilder.group({
    name: formBuilder.nonNullable.control('', [Validators.required, nonBlankValidator, Validators.maxLength(200)]),
    relationship: formBuilder.nonNullable.control('', [Validators.required, nonBlankValidator, Validators.maxLength(150)]),
    phoneNumber: formBuilder.nonNullable.control('', [Validators.required, nonBlankValidator, Validators.maxLength(50)]),
    alternativePhoneNumber: formBuilder.nonNullable.control('', Validators.maxLength(50)),
    email: formBuilder.nonNullable.control('', [Validators.email, Validators.maxLength(254)]),
    notes: formBuilder.nonNullable.control('', Validators.maxLength(2000)),
  });
}

export type EmergencyContactForm = ReturnType<typeof createEmergencyContactForm>;

export function mapEmergencyContactFormToRequest(form: EmergencyContactForm): EmergencyContactRequest {
  const value = form.getRawValue();

  return {
    name: value.name.trim(),
    relationship: value.relationship.trim(),
    phoneNumber: value.phoneNumber.trim(),
    alternativePhoneNumber: normaliseOptionalText(value.alternativePhoneNumber),
    email: normaliseOptionalText(value.email),
    notes: normaliseOptionalText(value.notes),
  };
}

export function resetEmergencyContactForm(form: EmergencyContactForm, contact: EmergencyContactResponse | null = null): void {
  form.reset({
    name: contact?.name ?? '',
    relationship: contact?.relationship ?? '',
    phoneNumber: contact?.phoneNumber ?? '',
    alternativePhoneNumber: contact?.alternativePhoneNumber ?? '',
    email: contact?.email ?? '',
    notes: contact?.notes ?? '',
  });
}

const nonBlankValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  return typeof value === 'string' && value.length > 0 && value.trim().length === 0 ? { blank: true } : null;
};
