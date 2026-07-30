import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PatientCarerAccessState } from '../../../care-network/services/patient-carer-access-state';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { PersonalPatientRecordState } from '../../../patient-record/services/personal-patient-record-state';
import { ProfileState } from '../../../profile/services/profile-state';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  private readonly profileState = inject(ProfileState);

  private readonly personalPatientRecordState = inject(PersonalPatientRecordState);

  private readonly patientCarerAccessState = inject(PatientCarerAccessState);

  private readonly selectedPatientState = inject(SelectedPatientState);

  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  protected readonly profile = this.profileState.profile;

  protected readonly personalPatientRecord = this.personalPatientRecordState.patientRecord;

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;

  protected readonly isLoading = this.patientContextCoordinator.isLoading;

  protected readonly loadFailed = this.patientContextCoordinator.loadFailed;

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

    return selectedPatient.contextType === 'SELF' ? 'Your patient record' : 'Shared patient record';
  });

  protected readonly canOpenSelectedPatient = computed(() => {
    const selectedPatient = this.selectedPatient();

    return selectedPatient !== null && this.selectedPatientState.canSelect(selectedPatient);
  });
}
