import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Permission } from '../../../../core/models/permission-model';
import { AuthService } from '../../../../core/services/auth-service';
import { PatientCarerAccessState } from '../../../care-network/services/patient-carer-access-state';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { PersonalPatientRecordState } from '../../../patient-record/services/personal-patient-record-state';
import { ProfileState } from '../../../profile/services/profile-state';

/**
 * Describes a feature shown on the dashboard when the selected patient allows access to it.
 */
interface DashboardFeature {
  title: string;
  description: string;
  route: string;
  permission: Permission;
  featured?: boolean;
}

const APPOINTMENT_FEATURES: readonly DashboardFeature[] = [
  {
    title: 'Appointments',
    description: 'View appointment dates, locations and details.',
    route: '/appointments',
    permission: 'appointment:view',
  },
  {
    title: 'Documents',
    description: 'Upload and review appointment and consultation letters.',
    route: '/documents',
    permission: 'document:view',
  },
  {
    title: 'Appointment packs',
    description: 'Bring selected patient information together for an upcoming appointment.',
    route: '/appointment-packs',
    permission: 'appointment-pack:view',
    featured: true,
  },
];

const HEALTH_RECORD_FEATURES: readonly DashboardFeature[] = [
  {
    title: 'Medications',
    description: 'Review current and previous medication information.',
    route: '/medications',
    permission: 'medication:view',
  },
  {
    title: 'Blood results',
    description: 'Review recorded blood tests and their results.',
    route: '/blood-results',
    permission: 'blood-result:view',
  },
  {
    title: 'Medical history',
    description: 'Review important medical history entries.',
    route: '/medical-history',
    permission: 'history:view',
  },
  {
    title: 'Contacts',
    description: 'Keep healthcare and emergency contacts together.',
    route: '/contacts',
    permission: 'contact:view',
  },
];

/**
 * Shows the dashboard for the current account and selected patient.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home {
  private readonly authService = inject(AuthService);
  private readonly profileState = inject(ProfileState);
  private readonly personalPatientRecordState = inject(PersonalPatientRecordState);
  private readonly patientCarerAccessState = inject(PatientCarerAccessState);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly profile = this.profileState.profile;
  protected readonly personalPatientRecord = this.personalPatientRecordState.patientRecord;
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly isLoading = this.patientContextCoordinator.isLoading;
  protected readonly loadFailed = this.patientContextCoordinator.loadFailed;
  protected readonly isAdmin = this.authService.isAdmin;

  protected readonly pendingInvitations = computed(() =>
    this.patientCarerAccessState
      .asCarerRelationships()
      .filter((relationship) => relationship.status === 'PENDING'),
  );

  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });

  protected readonly selectedPatientContextLabel = computed(() => {
    const selectedPatient = this.selectedPatient();

    if (selectedPatient === null) {
      return '';
    }

    return selectedPatient.contextType === 'SELF' ? 'Your record' : 'Shared record';
  });

  protected readonly canOpenSelectedPatient = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient !== null && this.authorisation.has(selectedPatient, 'patient-record:view');
  });

  protected readonly appointmentFeatures = computed(() => this.availableFeatures(APPOINTMENT_FEATURES));
  protected readonly healthRecordFeatures = computed(() => this.availableFeatures(HEALTH_RECORD_FEATURES));

  protected readonly canViewActivityHistory = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient !== null && this.authorisation.has(selectedPatient, 'audit:view');
  });

  /**
   * Returns the dashboard features available for the selected patient.
   */
  private availableFeatures(features: readonly DashboardFeature[]): readonly DashboardFeature[] {
    const selectedPatient = this.selectedPatient();

    if (selectedPatient === null) {
      return [];
    }

    return features.filter((feature) => this.authorisation.has(selectedPatient, feature.permission));
  }
}
