// Appointment form tests focus on rules added by this application rather than Angular's built-in validators.

import {FormBuilder} from '@angular/forms';

import {createAppointmentForm, mapAppointmentFormToRequest, resetAppointmentForm} from './appointment-form';

describe('appointment form', () => {
  let formBuilder: FormBuilder;

  // Creates a fresh FormBuilder before each test so forms do not share validation state.
  beforeEach(() => {
    formBuilder = new FormBuilder();
  });

  // Checks an optional end time is allowed only when it is later than the appointment start time.
  it('requires the end time to be later than the start time', () => {
    const form = createAppointmentForm(formBuilder);

    form.patchValue({ startTime: '10:00', endTime: '09:59' });
    expect(form.errors).toEqual({ endTimeAfterStart: true });

    form.patchValue({ endTime: '10:30' });
    expect(form.errors).toBeNull();
  });

  // Checks blank optional text and an entirely blank partial address become null in the API request.
  it('normalises blank optional fields when building an appointment request', () => {
    const form = createAppointmentForm(formBuilder);
    form.patchValue({
      date: '2026-08-20',
      startTime: '09:30',
      service: '   ',
      notes: '',
    });

    const request = mapAppointmentFormToRequest(form);

    expect(request.service).toBeNull();
    expect(request.notes).toBeNull();
    expect(request.address).toBeNull();
  });

  // Checks a partially known appointment address is kept rather than requiring every address field.
  it('keeps a partial appointment address in the request', () => {
    const form = createAppointmentForm(formBuilder);
    form.patchValue({
      date: '2026-08-20',
      startTime: '09:30',
    });
    form.controls.address.patchValue({
      addressLine1: 'Example Hospital',
      postcode: 'AB1 2CD',
    });

    const request = mapAppointmentFormToRequest(form);

    expect(request.address).toEqual({
      addressLine1: 'Example Hospital',
      addressLine2: null,
      townCity: null,
      county: null,
      postcode: 'AB1 2CD',
      country: null,
    });
  });

  // Checks backend-style time values are converted to the HH:mm format used by HTML time inputs.
  it('resets server time values into form-friendly values', () => {
    const form = createAppointmentForm(formBuilder);

    resetAppointmentForm(form, {
      date: '2026-08-20',
      startTime: '09:30:00',
      endTime: '10:15:00',
      service: null,
      appointmentType: null,
      clinicianOrTeam: null,
      locationName: null,
      address: null,
      notes: null,
    });

    expect(form.controls.startTime.value).toBe('09:30');
    expect(form.controls.endTime.value).toBe('10:15');
  });
});
