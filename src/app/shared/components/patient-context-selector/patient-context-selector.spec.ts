import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { Permission } from '../../../core/models/permission-model';
import { SelectedPatientContext } from '../../../features/patient-context/models/selected-patient-context';
import { PatientContextCoordinator } from '../../../features/patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../features/patient-context/services/selected-patient-state';
import { PatientContextSelector } from './patient-context-selector';

describe('PatientContextSelector', () => {
  const contexts: readonly SelectedPatientContext[] = [
    {
      patientRecordId: 'patient-self',
      profileId: 'profile-self',
      userId: 'user-self',
      firstName: 'Alex',
      lastName: 'Patient',
      contextType: 'SELF',
      permissions: new Set<Permission>(),
    },
    {
      patientRecordId: 'patient-shared',
      profileId: 'profile-shared',
      userId: 'user-shared',
      firstName: 'Sam',
      lastName: 'Shared',
      contextType: 'CARER',
      permissions: new Set<Permission>(['patient-record:view']),
    },
  ];

  // This creates the selector with two predictable patient contexts and small state mocks.
  function createSelector() {
    const selectedPatientRecordId = signal('patient-self');
    const selectedPatient = signal<SelectedPatientContext | null>(contexts[0]);
    const patientContexts = signal(contexts);
    const isLoading = signal(false);
    const loadFailed = signal(false);
    const selectPatient = vi.fn((patientRecordId: string) => {
      const context = contexts.find((item) => item.patientRecordId === patientRecordId) ?? null;

      if (context === null) {
        return false;
      }

      selectedPatientRecordId.set(patientRecordId);
      selectedPatient.set(context);
      return true;
    });

    TestBed.configureTestingModule({
      imports: [PatientContextSelector],
      providers: [
        {
          provide: SelectedPatientState,
          useValue: {
            contexts: patientContexts.asReadonly(),
            selectedPatientRecordId: selectedPatientRecordId.asReadonly(),
            selectedPatient: selectedPatient.asReadonly(),
            selectPatient,
          },
        },
        {
          provide: PatientContextCoordinator,
          useValue: {
            isLoading: isLoading.asReadonly(),
            loadFailed: loadFailed.asReadonly(),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(PatientContextSelector);
    fixture.componentRef.setInput('selectId', 'testPatientContext');
    fixture.detectChanges();

    return { fixture, selectPatient };
  }

  // This checks the selector exposes its open/closed state without pretending to be a full ARIA listbox.
  it('opens the patient options from the trigger button', () => {
    const { fixture } = createSelector();
    const trigger = fixture.nativeElement.querySelector('#testPatientContext') as HTMLButtonElement;

    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#testPatientContext-options')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeNull();
  });

  // This checks selecting a visible patient uses the shared selected-patient state and closes the menu.
  it('selects a patient from the open options', () => {
    const { fixture, selectPatient } = createSelector();
    const trigger = fixture.nativeElement.querySelector('#testPatientContext') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    const optionButtons = Array.from(
      fixture.nativeElement.querySelectorAll('#testPatientContext-options button'),
    ) as HTMLButtonElement[];

    optionButtons[1].click();
    fixture.detectChanges();

    expect(selectPatient).toHaveBeenCalledWith('patient-shared');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent).toContain('Sam Shared');
  });

  // This checks Escape dismisses the custom dropdown and safely returns keyboard focus to its trigger.
  it('closes on Escape and returns focus to the trigger button', () => {
    const { fixture } = createSelector();
    const trigger = fixture.nativeElement.querySelector('#testPatientContext') as HTMLButtonElement;

    trigger.click();
    fixture.detectChanges();

    const option = fixture.nativeElement.querySelector(
      '#testPatientContext-options button',
    ) as HTMLButtonElement;
    option.focus();

    option.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
});
