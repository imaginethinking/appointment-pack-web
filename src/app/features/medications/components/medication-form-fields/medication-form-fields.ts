import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { MedicationForm } from '../../forms/medication-form';

@Component({
  selector: 'app-medication-form-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './medication-form-fields.html',
})
export class MedicationFormFields {
  readonly form = input.required<MedicationForm>();
  readonly idPrefix = input('medication');
}
