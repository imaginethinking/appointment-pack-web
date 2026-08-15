import { Component, inject, input } from '@angular/core';

import { getPatientContextName, SelectedPatientContext } from '../../../features/patient-context/models/selected-patient-context';
import { PatientContextCoordinator } from '../../../features/patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../features/patient-context/services/selected-patient-state';

@Component({
  selector: 'app-patient-context-selector',
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

  protected canSelectPatient(context: SelectedPatientContext): boolean {
    return this.selectedPatientState.canSelect(context);
  }

  protected patientContextLabel(context: SelectedPatientContext): string {
    const relationshipLabel = context.contextType === 'SELF' ? 'Your record' : 'Carer access';
    return `${getPatientContextName(context)} — ${relationshipLabel}`;
  }

  protected selectPatient(event: Event): void {
    const patientRecordId = (event.target as HTMLSelectElement).value;

    if (patientRecordId.length > 0) {
      this.selectedPatientState.selectPatient(patientRecordId);
    }
  }
}
