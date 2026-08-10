import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SummaryReview } from './summary-review';

describe('SummaryReview', () => {
  let component: SummaryReview;
  let fixture: ComponentFixture<SummaryReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryReview],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
