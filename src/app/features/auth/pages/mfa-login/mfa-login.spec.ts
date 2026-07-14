import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MfaLogin } from './mfa-login';

describe('MfaLogin', () => {
  let component: MfaLogin;
  let fixture: ComponentFixture<MfaLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MfaLogin],
    }).compileComponents();

    fixture = TestBed.createComponent(MfaLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
