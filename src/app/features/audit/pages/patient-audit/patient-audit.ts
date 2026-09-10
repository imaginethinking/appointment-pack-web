import {DatePipe} from '@angular/common';
import {Component, effect, inject, signal} from '@angular/core';

import {getHttpErrorMessage} from '../../../../core/http/http-error-message';
import {hasHttpStatus} from '../../../../core/http/http-problem-detail';
import {getPatientContextName} from '../../../patient-context/models/selected-patient-context';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {
  getPatientActivityActionLabel,
  getPatientResourceTypeLabel,
  PatientAuditPageResponse,
} from '../../models/patient-audit-model';
import {PatientAuditApiService} from '../../services/patient-audit-api-service';

const AUDIT_PAGE_SIZE = 25;

type PatientAuditStatus = 'loading' | 'ready' | 'no-patient' | 'forbidden' | 'error';

/**
 * Shows the recorded activity for the patient currently selected.
 */
@Component({
  selector: 'app-patient-audit',
  imports: [DatePipe],
  templateUrl: './patient-audit.html',
})
export class PatientAudit {
  private readonly patientAuditApi = inject(PatientAuditApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  private readonly reloadVersion = signal(0);
  private readonly pageIndex = signal(0);
  private loadedPatientRecordId: string | null = null;

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly auditPage = signal<PatientAuditPageResponse | null>(null);
  protected readonly status = signal<PatientAuditStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly getPatientContextName = getPatientContextName;
  protected readonly getResourceTypeLabel = getPatientResourceTypeLabel;
  protected readonly getActionLabel = getPatientActivityActionLabel;

  /**
   * Loads activity when the selected patient page or retry state changes.
   */
  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();

      const selectedPatient = this.selectedPatient();
      const patientRecordId = selectedPatient?.patientRecordId ?? null;

      if (patientRecordId !== this.loadedPatientRecordId) {
        this.loadedPatientRecordId = patientRecordId;

        if (this.pageIndex() !== 0) {
          this.pageIndex.set(0);
          return;
        }
      }

      const requestedPage = this.pageIndex();

      this.auditPage.set(null);
      this.errorMessage.set('');

      if (selectedPatient === null) {
        this.status.set('no-patient');
        return;
      }

      if (!this.authorisation.can(selectedPatient, 'audit', 'view')) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = this.patientAuditApi.getAuditEvents(
        selectedPatient.patientRecordId,
        requestedPage,
        AUDIT_PAGE_SIZE,
      ).subscribe({
        next: (auditPage) => {
          this.auditPage.set(auditPage);
          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  /**
   * Reloads the current page of activity.
   */
  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  /**
   * Moves to the previous page when one is available.
   */
  protected previousPage(): void {
    if (this.pageIndex() === 0 || this.status() === 'loading') {
      return;
    }

    this.pageIndex.update((page) => page - 1);
  }

  /**
   * Moves to the next page when more activity is available.
   */
  protected nextPage(): void {
    const auditPage = this.auditPage();

    if (auditPage === null || auditPage.page + 1 >= auditPage.totalPages || this.status() === 'loading') {
      return;
    }

    this.pageIndex.update((page) => page + 1);
  }

  /**
   * Returns the first activity number shown on the current page.
   */
  protected showingFrom(auditPage: PatientAuditPageResponse): number {
    if (auditPage.totalElements === 0) {
      return 0;
    }

    return auditPage.page * auditPage.size + 1;
  }

  /**
   * Returns the last activity number shown on the current page.
   */
  protected showingTo(auditPage: PatientAuditPageResponse): number {
    return Math.min((auditPage.page + 1) * auditPage.size, auditPage.totalElements);
  }

  /**
   * Handles errors while loading activity and refreshes patient access when needed.
   */
  private handleLoadError(error: unknown): void {
    if (hasHttpStatus(error, 403)) {
      this.status.set('forbidden');
      this.refreshPatientAccess();
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('error');
      this.errorMessage.set('The selected patient record is no longer available.');
      this.refreshPatientAccess();
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load activity history.'));
  }

  /**
   * Refreshes patient access and checks whether activity can still be viewed.
   */
  private refreshPatientAccess(): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient !== null && !this.authorisation.can(selectedPatient, 'audit', 'view')) {
          this.status.set('forbidden');
        }
      },
      error: (error: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(error, 'Unable to refresh patient access.'));
      },
    });
  }
}
