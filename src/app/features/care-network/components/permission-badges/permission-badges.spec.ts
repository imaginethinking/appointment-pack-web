import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermissionBadges } from './permission-badges';

describe('PermissionBadges', () => {
  let component: PermissionBadges;
  let fixture: ComponentFixture<PermissionBadges>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionBadges],
    }).compileComponents();

    fixture = TestBed.createComponent(PermissionBadges);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
