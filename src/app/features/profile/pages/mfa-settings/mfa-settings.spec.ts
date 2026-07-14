import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MfaSettings } from './mfa-settings';

describe('MfaSettings', () => {
  let component: MfaSettings;
  let fixture: ComponentFixture<MfaSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MfaSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(MfaSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
