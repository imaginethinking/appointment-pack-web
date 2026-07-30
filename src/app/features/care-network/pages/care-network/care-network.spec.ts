import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CareNetwork } from './care-network';

describe('CareNetwork', () => {
  let component: CareNetwork;
  let fixture: ComponentFixture<CareNetwork>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareNetwork],
    }).compileComponents();

    fixture = TestBed.createComponent(CareNetwork);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
