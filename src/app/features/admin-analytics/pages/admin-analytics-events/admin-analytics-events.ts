import {DatePipe} from '@angular/common';
import {Component, inject, OnInit, signal} from '@angular/core';
import {AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn,} from '@angular/forms';
import {RouterLink} from '@angular/router';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {getApplicationPageLabel} from '../../../../core/models/application-page-model';
import {formatEnumLabel} from '../../../../shared/utils/formatting';
import {getPatientActivityActionLabel, getPatientResourceTypeLabel,} from '../../../audit/models/patient-audit-model';
import {getDocumentTypeLabel} from '../../../documents/models/document-model';
import {
  AnalyticsRangeQuery,
  getOperationalEventCategoryLabel,
  OPERATIONAL_EVENT_CATEGORIES,
  OperationalEventCategory,
  OperationalEventPageResponse,
  OperationalEventQuery,
} from '../../models/admin-analytics-model';
import {AdminAnalyticsApiService} from '../../services/admin-analytics-api-service';

const EVENT_PAGE_SIZE = 50;

/**
 * Displays operational events with date category and page filters.
 */
@Component({
  selector: 'app-admin-analytics-events',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './admin-analytics-events.html',
})
export class AdminAnalyticsEvents implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminAnalyticsApi = inject(AdminAnalyticsApiService);

  protected readonly eventPage = signal<OperationalEventPageResponse | null>(null);
  protected readonly status = signal<'loading' | 'ready' | 'forbidden' | 'error'>('loading');
  protected readonly errorMessage = signal('');
  protected readonly categories = OPERATIONAL_EVENT_CATEGORIES;
  protected readonly getCategoryLabel = getOperationalEventCategoryLabel;
  protected readonly getPageLabel = getApplicationPageLabel;
  protected readonly getResourceTypeLabel = getPatientResourceTypeLabel;
  protected readonly getPatientActionLabel = getPatientActivityActionLabel;
  protected readonly getDocumentTypeLabel = getDocumentTypeLabel;
  protected readonly formatEnum = formatEnumLabel;

  protected readonly filterForm = this.formBuilder.group({
    from: this.formBuilder.nonNullable.control(''),
    to: this.formBuilder.nonNullable.control(''),
    category: this.formBuilder.nonNullable.control<OperationalEventCategory | ''>(''),
  }, {
    validators: analyticsDateRangeValidator,
  });

  /**
   * Loads the first page of operational events when the page opens.
   */
  ngOnInit(): void {
    this.loadEvents(0);
  }

  /**
   * Checks the selected filters and loads the first matching page.
   */
  protected applyFilters(): void {
    this.errorMessage.set('');

    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }

    this.loadEvents(0);
  }

  /**
   * Clears the event filters and returns to the first page.
   */
  protected resetFilters(): void {
    this.filterForm.reset({
      from: '',
      to: '',
      category: '',
    });

    this.loadEvents(0);
  }

  /**
   * Reloads the page of events currently being viewed.
   */
  protected retry(): void {
    const currentPage = this.eventPage()?.page ?? 0;
    this.loadEvents(currentPage);
  }

  /**
   * Loads the previous page when one is available.
   */
  protected previousPage(): void {
    const currentPage = this.eventPage();

    if (
      currentPage === null
      || currentPage.page === 0
      || this.status() === 'loading'
    ) {
      return;
    }

    this.loadEvents(currentPage.page - 1);
  }

  /**
   * Loads the next page when more events are available.
   */
  protected nextPage(): void {
    const currentPage = this.eventPage();

    if (
      currentPage === null
      || currentPage.page + 1 >= currentPage.totalPages
      || this.status() === 'loading'
    ) {
      return;
    }

    this.loadEvents(currentPage.page + 1);
  }

  /**
   * Returns the first event number shown on the current page.
   */
  protected showingFrom(page: OperationalEventPageResponse): number {
    return page.totalElements === 0
      ? 0
      : page.page * page.size + 1;
  }

  /**
   * Returns the last event number shown on the current page.
   */
  protected showingTo(page: OperationalEventPageResponse): number {
    return Math.min(
      (page.page + 1) * page.size,
      page.totalElements,
    );
  }

  /**
   * Formats an event duration as milliseconds or seconds.
   */
  protected formatDuration(durationMs: number | null): string {
    if (durationMs === null) {
      return 'Not provided';
    }

    if (durationMs < 1000) {
      return `${durationMs} ms`;
    }

    return `${(durationMs / 1000).toFixed(2)} s`;
  }

  /**
   * Loads the requested page using the filters currently selected.
   */
  private loadEvents(page: number): void {
    if (this.filterForm.invalid) {
      return;
    }

    this.status.set('loading');
    this.errorMessage.set('');

    this.adminAnalyticsApi.getEvents(this.buildEventQuery(page)).subscribe({
      next: (eventPage) => {
        this.eventPage.set(eventPage);
        this.status.set('ready');
      },
      error: (error: unknown) => {
        if (hasHttpStatus(error, 403)) {
          this.eventPage.set(null);
          this.status.set('forbidden');
          return;
        }

        this.eventPage.set(null);
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load operational events.'));
      },
    });
  }

  /**
   * Creates the event query using the current filters and requested page.
   */
  private buildEventQuery(page: number): OperationalEventQuery {
    const range = this.buildRangeQuery();
    const category = this.filterForm.controls.category.value;

    return {
      ...range,
      category: category === '' ? undefined : category,
      page,
      size: EVENT_PAGE_SIZE,
    };
  }

  /**
   * Creates the optional date range used by the event request.
   */
  private buildRangeQuery(): AnalyticsRangeQuery {
    const value = this.filterForm.getRawValue();
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
 * Checks that the end of the selected date range is later than the start.
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
