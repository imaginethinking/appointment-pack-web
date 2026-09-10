// Patient measurements have a few application-specific rules that are worth protecting separately from the page UI.

import {FormBuilder} from '@angular/forms';

import {createPatientRecordForm, mapPatientRecordFormToRequest} from './patient-record-form';

describe('patient record form', () => {
  let formBuilder: FormBuilder;

  // Creates a clean FormBuilder before each patient-record validation test.
  beforeEach(() => {
    formBuilder = new FormBuilder();
  });

  // Checks a measurement value cannot be supplied without its unit.
  it('requires height and height unit to be supplied together', () => {
    const form = createPatientRecordForm(formBuilder);

    form.patchValue({ height: 1.75, heightUnit: null });
    expect(form.errors?.['heightPair']).toBe(true);

    form.patchValue({ heightUnit: 'METERS' });
    expect(form.errors?.['heightPair']).toBeUndefined();
  });

  // Checks a unit by itself is also rejected because the backend expects the measurement pair to be complete.
  it('requires weight and weight unit to be supplied together', () => {
    const form = createPatientRecordForm(formBuilder);

    form.patchValue({ weight: null, weightUnit: 'KILOGRAMS' });

    expect(form.errors?.['weightPair']).toBe(true);
  });

  // Checks measurement precision stays within the two decimal places accepted by the patient-record contract.
  it('rejects measurements with more than two decimal places', () => {
    const form = createPatientRecordForm(formBuilder);

    form.controls.height.setValue(1.756);

    expect(form.controls.height.errors?.['decimalPlaces']).toEqual({ maximum: 2, actual: 3 });
  });

  // Checks optional identifier text is trimmed/normalised before it becomes an API request.
  it('normalises optional patient identifiers when building the request', () => {
    const form = createPatientRecordForm(formBuilder);
    form.patchValue({ nhsNumber: ' 1234567890 ', chiNumber: '   ', hcNumber: '' });

    const request = mapPatientRecordFormToRequest(form);

    expect(request.nhsNumber).toBe('1234567890');
    expect(request.chiNumber).toBeNull();
    expect(request.hcNumber).toBeNull();
  });
});
