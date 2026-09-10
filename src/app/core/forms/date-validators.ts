import {AbstractControl, ValidationErrors, ValidatorFn} from '@angular/forms';

export const pastOrPresentDateValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match === null) {
    return { pastOrPresentDate: true };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { pastOrPresentDate: true };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date <= today ? null : { pastOrPresentDate: true };
};
