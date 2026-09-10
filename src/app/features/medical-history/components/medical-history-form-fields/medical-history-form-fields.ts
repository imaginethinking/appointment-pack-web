import {Component, input} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';

import {MedicalHistoryForm} from '../../forms/medical-history-form';

/**
 * Displays the shared fields used for creating and editing Medical History entries.
 */
@Component({
  selector: 'app-medical-history-form-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './medical-history-form-fields.html',
})
export class MedicalHistoryFormFields {
  readonly form = input.required<MedicalHistoryForm>();
  readonly idPrefix = input('medical-history');
}
