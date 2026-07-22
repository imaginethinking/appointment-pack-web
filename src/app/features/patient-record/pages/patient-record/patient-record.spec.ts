import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientRecord } from './patient-record';

describe('PatientRecord', () => {
  let component: PatientRecord;
  let fixture: ComponentFixture<PatientRecord>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientRecord],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientRecord);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
