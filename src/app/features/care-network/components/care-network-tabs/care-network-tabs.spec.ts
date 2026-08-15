import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CareNetworkTabs } from './care-network-tabs';

describe('CareNetworkTabs', () => {
  let component: CareNetworkTabs;
  let fixture: ComponentFixture<CareNetworkTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CareNetworkTabs],
    }).compileComponents();

    fixture = TestBed.createComponent(CareNetworkTabs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
