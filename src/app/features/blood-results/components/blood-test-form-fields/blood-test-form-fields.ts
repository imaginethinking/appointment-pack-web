import {Component, inject, input} from '@angular/core';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';

import {formatEnumLabel} from '../../../../shared/utils/formatting';
import {addBloodTestResult, BloodTestForm, removeBloodTestResult} from '../../forms/blood-test-form';
import {BLOOD_TEST_RESULT_FLAGS} from '../../models/blood-test-model';

/**
 * Displays the shared fields used for entering a blood test and its results.
 */
@Component({
  selector: 'app-blood-test-form-fields',
  imports: [ReactiveFormsModule],
  templateUrl: './blood-test-form-fields.html',
})
export class BloodTestFormFields {
  private readonly formBuilder = inject(FormBuilder);

  readonly form = input.required<BloodTestForm>();
  readonly idPrefix = input('blood-test');

  protected readonly resultFlags = BLOOD_TEST_RESULT_FLAGS;
  protected readonly formatOption = formatEnumLabel;

  /**
   * Adds another result row to the blood test form.
   */
  protected addResult(): void {
    addBloodTestResult(this.form(), this.formBuilder);
  }

  /**
   * Removes the selected result row from the blood test form.
   */
  protected removeResult(index: number): void {
    removeBloodTestResult(this.form(), index);
  }
}
