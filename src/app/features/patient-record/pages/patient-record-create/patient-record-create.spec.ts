import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientRecordCreate } from './patient-record-create';

describe('PatientRecordCreate', () => {
  let component: PatientRecordCreate;
  let fixture: ComponentFixture<PatientRecordCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientRecordCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientRecordCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
