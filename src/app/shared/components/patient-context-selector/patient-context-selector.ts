import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { getPatientContextName, SelectedPatientContext } from '../../../features/patient-context/models/selected-patient-context';
import { PatientContextCoordinator } from '../../../features/patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../features/patient-context/services/selected-patient-state';

@Component({
  selector: 'app-patient-context-selector',
  imports: [FormsModule],
  templateUrl: './patient-context-selector.html',
})
export class PatientContextSelector {
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);

  readonly selectId = input.required<string>();
  readonly showLabel = input(false);
  readonly fullWidth = input(false);

  protected readonly patientContexts = this.selectedPatientState.contexts;
  protected readonly selectedPatientRecordId = this.selectedPatientState.selectedPatientRecordId;
  protected readonly isLoading = this.patientContextCoordinator.isLoading;
  protected readonly loadFailed = this.patientContextCoordinator.loadFailed;

  protected patientContextLabel(context: SelectedPatientContext): string {
    const relationshipLabel = context.contextType === 'SELF' ? 'Your record' : 'Carer access';
    return `${getPatientContextName(context)} — ${relationshipLabel}`;
  }

  protected selectPatient(patientRecordId: string): void {
    if (patientRecordId.length > 0) {
      this.selectedPatientState.selectPatient(patientRecordId);
    }
  }
}
