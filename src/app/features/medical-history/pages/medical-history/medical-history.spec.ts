import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicalHistory } from './medical-history';

describe('MedicalHistory', () => {
  let component: MedicalHistory;
  let fixture: ComponentFixture<MedicalHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicalHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
