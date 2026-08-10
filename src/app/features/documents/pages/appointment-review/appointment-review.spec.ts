import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentReview } from './appointment-review';

describe('AppointmentReview', () => {
  let component: AppointmentReview;
  let fixture: ComponentFixture<AppointmentReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentReview],
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
