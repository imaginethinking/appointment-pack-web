import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientRecordEdit } from './patient-record-edit';

describe('PatientRecordEdit', () => {
  let component: PatientRecordEdit;
  let fixture: ComponentFixture<PatientRecordEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientRecordEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientRecordEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
