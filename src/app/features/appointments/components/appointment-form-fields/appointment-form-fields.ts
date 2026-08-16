import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AppointmentForm } from '../../forms/appointment-form';

@Component({
  selector: 'app-appointment-form-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './appointment-form-fields.html',
})
export class AppointmentFormFields {
  readonly form = input.required<AppointmentForm>();
  readonly idPrefix = input('appointment');
}
