import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { HealthcareContactForm } from '../../forms/healthcare-contact-form';

/**
 * Displays the shared fields used for creating and editing healthcare contacts.
 */
@Component({
  selector: 'app-healthcare-contact-form-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './healthcare-contact-form-fields.html',
})
export class HealthcareContactFormFields {
  readonly form = input.required<HealthcareContactForm>();
  readonly idPrefix = input('healthcare-contact');
}
