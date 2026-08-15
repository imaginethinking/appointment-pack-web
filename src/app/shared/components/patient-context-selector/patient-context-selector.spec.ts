import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PatientContextSelector } from './patient-context-selector';

describe('PatientContextSelector', () => {
  let component: PatientContextSelector;
  let fixture: ComponentFixture<PatientContextSelector>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientContextSelector],
    }).compileComponents();

    fixture = TestBed.createComponent(PatientContextSelector);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
