import { Component, ElementRef, HostListener, computed, inject, input, signal, viewChild } from '@angular/core';

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
  private readonly triggerButton = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');

  readonly selectId = input.required<string>();
  readonly showLabel = input(false);
  readonly fullWidth = input(false);

  protected readonly patientContexts = this.selectedPatientState.contexts;
  protected readonly selectedPatientRecordId = this.selectedPatientState.selectedPatientRecordId;
  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly isLoading = this.patientContextCoordinator.isLoading;
  protected readonly loadFailed = this.patientContextCoordinator.loadFailed;
  protected readonly menuOpen = signal(false);

  protected readonly triggerLabel = computed(() => {
    if (this.isLoading()) {
      return 'Loading patients...';
    }

    if (this.loadFailed()) {
      return 'Unable to load patients';
    }

    const patient = this.selectedPatient();

    if (patient !== null) {
      return this.patientContextLabel(patient);
    }

    return this.patientContexts().length === 0
      ? 'No patient access'
      : 'Select patient';
  });

  protected patientName(context: SelectedPatientContext): string {
    return getPatientContextName(context);
  }

  protected patientContextLabel(context: SelectedPatientContext): string {
    const relationshipLabel = context.contextType === 'SELF' ? 'Your record' : 'Carer access';
    return `${getPatientContextName(context)} — ${relationshipLabel}`;
  }

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();

    if (this.isLoading() || this.loadFailed() || this.patientContexts().length === 0) {
      return;
    }

    this.menuOpen.update((open) => !open);
  }

  protected selectPatient(patientRecordId: string, event: MouseEvent): void {
    event.stopPropagation();

    if (this.selectedPatientState.selectPatient(patientRecordId)) {
      this.menuOpen.set(false);
    }
  }

  protected isSelected(context: SelectedPatientContext): boolean {
    return context.patientRecordId === this.selectedPatientRecordId();
  }

  @HostListener('document:click')
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  // Escape closes the custom selector and returns focus to the button that opened it.
  protected closeMenuOnEscape(): void {
    if (!this.menuOpen()) {
      return;
    }

    this.menuOpen.set(false);
    this.triggerButton()?.nativeElement.focus();
  }
}
