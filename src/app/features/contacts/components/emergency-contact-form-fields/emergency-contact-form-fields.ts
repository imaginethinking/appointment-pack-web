import {Component, input} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';

import {EmergencyContactForm} from '../../forms/emergency-contact-form';

/**
 * Displays the shared fields used for creating and editing emergency contacts.
 */
@Component({
  selector: 'app-emergency-contact-form-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './emergency-contact-form-fields.html',
})
export class EmergencyContactFormFields {
  readonly form = input.required<EmergencyContactForm>();
  readonly idPrefix = input('emergency-contact');
}
