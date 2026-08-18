// Clinical dates can normally be today or in the past, unlike date of birth which must be earlier than today.

import { FormControl } from '@angular/forms';

import { pastOrPresentDateValidator } from './date-validators';

describe('pastOrPresentDateValidator', () => {
  // Uses one fixed date for every test so the expected result remains deterministic.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 12, 0, 0));
  });

  // Returns the real clock after each test so other test files are not affected.
  afterEach(() => {
    vi.useRealTimers();
  });

  // Checks both a past date and today's date are valid clinical dates.
  it('accepts past and present dates', () => {
    expect(pastOrPresentDateValidator(new FormControl('2026-08-17'))).toBeNull();
    expect(pastOrPresentDateValidator(new FormControl('2026-08-18'))).toBeNull();
  });

  // Checks future clinical dates are rejected by the shared validator.
  it('rejects a future date', () => {
    expect(pastOrPresentDateValidator(new FormControl('2026-08-19'))).toEqual({ pastOrPresentDate: true });
  });

  // Checks impossible or incorrectly formatted dates cannot pass validation accidentally.
  it('rejects invalid date values', () => {
    expect(pastOrPresentDateValidator(new FormControl('18/08/2026'))).toEqual({ pastOrPresentDate: true });
    expect(pastOrPresentDateValidator(new FormControl('2026-02-30'))).toEqual({ pastOrPresentDate: true });
  });
});
