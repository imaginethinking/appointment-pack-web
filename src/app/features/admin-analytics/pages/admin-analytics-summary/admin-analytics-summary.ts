import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { getApplicationPageLabel } from '../../../../core/models/application-page-model';
import {
  getPatientActivityActionLabel,
  getPatientResourceTypeLabel,
} from '../../../audit/models/patient-audit-model';
import {
  AdminAnalyticsSummaryResponse,
  AnalyticsRangeQuery,
} from '../../models/admin-analytics-model';
import { AdminAnalyticsApiService } from '../../services/admin-analytics-api-service';

/**
 * Shows the main application analytics with an optional date range.
 */
@Component({
  selector: 'app-admin-analytics-summary',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-analytics-summary.html',
})
export class AdminAnalyticsSummary implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminAnalyticsApi = inject(AdminAnalyticsApiService);

  protected readonly summary = signal<AdminAnalyticsSummaryResponse | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly getPageLabel = getApplicationPageLabel;
  protected readonly getResourceTypeLabel = getPatientResourceTypeLabel;
  protected readonly getPatientActionLabel = getPatientActivityActionLabel;

  protected readonly rangeForm = this.formBuilder.group({
    from: this.formBuilder.nonNullable.control(''),
    to: this.formBuilder.nonNullable.control(''),
  }, {
    validators: analyticsDateRangeValidator,
  });

  /**
   * Loads the analytics summary when the page opens.
   */
  ngOnInit(): void {
    this.loadSummary();
  }

  /**
   * Checks the selected dates and reloads the summary using that range.
   */
  protected applyRange(): void {
    this.errorMessage.set('');

    if (this.rangeForm.invalid) {
      this.rangeForm.markAllAsTouched();
      return;
    }

    this.loadSummary();
  }

  /**
   * Clears the date range and reloads the full summary.
   */
  protected resetRange(): void {
    this.rangeForm.reset({
      from: '',
      to: '',
    });

    this.loadSummary();
  }

  /**
   * Tries to load the analytics summary again.
   */
  protected retry(): void {
    this.loadSummary();
  }

  /**
   * Formats a duration as milliseconds or seconds for display.
   */
  protected formatDuration(durationMs: number | null): string {
    if (durationMs === null) {
      return 'Not available';
    }

    if (durationMs < 1000) {
      return `${durationMs} ms`;
    }

    return `${(durationMs / 1000).toFixed(2)} s`;
  }

  /**
   * Loads the analytics summary using the current date range.
   */
  private loadSummary(): void {
    if (this.rangeForm.invalid) {
      return;
    }

    this.status.set('loading');
    this.errorMessage.set('');

    this.adminAnalyticsApi.getSummary(this.buildRangeQuery()).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        if (hasHttpStatus(error, 403)) {
          this.summary.set(null);
          this.status.set('forbidden');
          return;
        }

        this.summary.set(null);
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load admin analytics.'));
      },
    });
  }

  /**
   * Creates the date range query from the values entered in the form.
   */
  private buildRangeQuery(): AnalyticsRangeQuery {
    const value = this.rangeForm.getRawValue();
    const query: AnalyticsRangeQuery = {};

    if (value.from.length > 0) {
      query.from = new Date(value.from).toISOString();
    }

    if (value.to.length > 0) {
      query.to = new Date(value.to).toISOString();
    }

    return query;
  }
}

/**
 * Checks that the end of an analytics date range is later than the start.
 */
const analyticsDateRangeValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const from = control.get('from')?.value;
  const to = control.get('to')?.value;

  if (
    typeof from !== 'string'
    || from.length === 0
    || typeof to !== 'string'
    || to.length === 0
  ) {
    return null;
  }

  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();

  return Number.isFinite(fromTime)
  && Number.isFinite(toTime)
  && fromTime < toTime
    ? null
    : { invalidAnalyticsRange: true };
};
