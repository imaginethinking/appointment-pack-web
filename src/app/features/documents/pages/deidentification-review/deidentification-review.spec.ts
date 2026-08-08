import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeidentificationReview } from './deidentification-review';

describe('DeidentificationReview', () => {
  let component: DeidentificationReview;
  let fixture: ComponentFixture<DeidentificationReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeidentificationReview],
    }).compileComponents();

    fixture = TestBed.createComponent(DeidentificationReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
