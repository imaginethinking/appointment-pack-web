import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatEnumLabel } from '../../../../shared/utils/formatting';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { BloodTestResponse } from '../../models/blood-test-model';
import { BloodTestApiService } from '../../services/blood-test-api-service';

type BloodTestDetailsStatus = 'loading' | 'ready' | 'invalid' | 'not-found' | 'forbidden' | 'error';

@Component({
  selector: 'app-blood-test-details',
  imports: [DatePipe, RouterLink],
  templateUrl: './blood-test-details.html',
})
export class BloodTestDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bloodTestApi = inject(BloodTestApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly bloodTest = signal<BloodTestResponse | null>(null);
  protected readonly status = signal<BloodTestDetailsStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly isArchiving = signal(false);
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly canEdit = computed(() => this.authorisation.can(this.selectedPatient(), 'blood-result', 'edit'));
  protected readonly formatFlag = formatEnumLabel;

  constructor() {
    effect(() => {
      const bloodTest = this.bloodTest();
      const selectedPatient = this.selectedPatient();

      if (bloodTest !== null && (selectedPatient === null || bloodTest.patientRecordId !== selectedPatient.patientRecordId)) {
        void this.router.navigate(['/blood-results']);
      }
    });
  }

  ngOnInit(): void {
    const bloodTestId = this.route.snapshot.paramMap.get('bloodTestId');

    if (bloodTestId === null || bloodTestId.length === 0) {
      this.status.set('not-found');
      return;
    }

    this.loadBloodTest(bloodTestId);
  }

  protected retry(): void {
    const bloodTestId = this.route.snapshot.paramMap.get('bloodTestId');

    if (bloodTestId !== null) {
      this.loadBloodTest(bloodTestId);
    }
  }

  protected archive(): void {
    const bloodTest = this.bloodTest();
    this.actionError.set('');

    if (bloodTest === null || !this.canEdit() || this.status() !== 'ready') {
      return;
    }

    if (!window.confirm('Archive this blood test? It will no longer appear in the normal blood-results list.')) {
      return;
    }

    this.isArchiving.set(true);

    this.bloodTestApi.archiveBloodTest(bloodTest.id).pipe(
      finalize(() => this.isArchiving.set(false)),
    ).subscribe({
      next: () => void this.router.navigate(['/blood-results']),
      error: (error: unknown) => this.handleArchiveError(error, bloodTest),
    });
  }

  private loadBloodTest(bloodTestId: string): void {
    const failedPatientRecordId = this.selectedPatient()?.patientRecordId ?? null;

    this.status.set('loading');
    this.errorMessage.set('');
    this.actionError.set('');
    this.bloodTest.set(null);

    this.bloodTestApi.getBloodTest(bloodTestId).subscribe({
      next: (bloodTest) => {
        const selectedPatient = this.selectedPatient();

        if (selectedPatient === null || bloodTest.patientRecordId !== selectedPatient.patientRecordId) {
          this.status.set('invalid');
          this.errorMessage.set('This blood test does not belong to the currently selected patient.');
          return;
        }

        this.bloodTest.set(bloodTest);
        this.status.set('ready');
      },
      error: (error: unknown) => this.handleLoadError(error, failedPatientRecordId),
    });
  }

  private handleLoadError(error: unknown, failedPatientRecordId: string | null): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(failedPatientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load the blood test.'));
  }

  private handleArchiveError(error: unknown, bloodTest: BloodTestResponse): void {
    if (hasHttpStatus(error, 403)) {
      this.recoverPatientAccess(bloodTest.patientRecordId);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('not-found');
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to archive the blood test.'));
  }

  private recoverPatientAccess(failedPatientRecordId: string | null): void {
    this.status.set('loading');

    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/blood-results']);
          return;
        }

        this.status.set('forbidden');
      },
      error: (refreshError: unknown) => {
        this.status.set('error');
        this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.'));
      },
    });
  }
}
