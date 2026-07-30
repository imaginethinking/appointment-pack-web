import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CarerAccess } from './carer-access';

describe('CarerAccess', () => {
  let component: CarerAccess;
  let fixture: ComponentFixture<CarerAccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarerAccess],
    }).compileComponents();

    fixture = TestBed.createComponent(CarerAccess);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
