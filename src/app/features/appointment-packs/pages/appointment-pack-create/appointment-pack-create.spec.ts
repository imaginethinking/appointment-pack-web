// Appointment packs combine several patient resources, so the useful frontend tests are mainly selection and permission rules.
// The tests use real PatientContextAuthorisation with mocked feature APIs to keep the permission behaviour realistic.

import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { Permission } from '../../../../core/models/permission-model';
import { AppointmentResponse } from '../../../appointments/models/appointment-model';
import { AppointmentApiService } from '../../../appointments/services/appointment-api-service';
import { BloodTestApiService } from '../../../blood-results/services/blood-test-api-service';
import { EmergencyContactApiService } from '../../../contacts/services/emergency-contact-api-service';
import { HealthcareContactApiService } from '../../../contacts/services/healthcare-contact-api-service';
import { MedicalHistoryApiService } from '../../../medical-history/services/medical-history-api-service';
import { MedicationResponse } from '../../../medications/models/medication-model';
import { MedicationApiService } from '../../../medications/services/medication-api-service';
import { SelectedPatientContext } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { AppointmentPackResponse } from '../../models/appointment-pack-model';
import { AppointmentPackApiService } from '../../services/appointment-pack-api-service';
import { AppointmentPackCreate } from './appointment-pack-create';

describe('AppointmentPackCreate', () => {
  let fixture: ComponentFixture<AppointmentPackCreate> | null = null;
  let selectedPatient: WritableSignal<SelectedPatientContext | null>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let appointmentPackApi: { generateAppointmentPack: ReturnType<typeof vi.fn> };
  let appointmentApi: { getAppointments: ReturnType<typeof vi.fn> };
  let medicationApi: { getMedications: ReturnType<typeof vi.fn> };
  let healthcareContactApi: { getHealthcareContacts: ReturnType<typeof vi.fn> };
  let emergencyContactApi: { getEmergencyContacts: ReturnType<typeof vi.fn> };
  let medicalHistoryApi: { getMedicalHistory: ReturnType<typeof vi.fn> };
  let bloodTestApi: { getBloodTests: ReturnType<typeof vi.fn> };

  // Uses an owner context by default so all optional resource APIs are available unless a test replaces the context.
  beforeEach(() => {
    selectedPatient = signal(createSelfContext());
    router = { navigate: vi.fn().mockResolvedValue(true) };
    appointmentPackApi = { generateAppointmentPack: vi.fn().mockReturnValue(of(createPackResponse())) };
    appointmentApi = { getAppointments: vi.fn().mockReturnValue(of([createAppointment()])) };
    medicationApi = { getMedications: vi.fn().mockReturnValue(of(createMedications())) };
    healthcareContactApi = { getHealthcareContacts: vi.fn().mockReturnValue(of([])) };
    emergencyContactApi = { getEmergencyContacts: vi.fn().mockReturnValue(of([])) };
    medicalHistoryApi = { getMedicalHistory: vi.fn().mockReturnValue(of([])) };
    bloodTestApi = { getBloodTests: vi.fn().mockReturnValue(of([])) };

    TestBed.configureTestingModule({
      imports: [AppointmentPackCreate],
      providers: [
        FormBuilder,
        PatientContextAuthorisation,
        { provide: Router, useValue: router },
        { provide: AppointmentPackApiService, useValue: appointmentPackApi },
        { provide: AppointmentApiService, useValue: appointmentApi },
        { provide: MedicationApiService, useValue: medicationApi },
        { provide: HealthcareContactApiService, useValue: healthcareContactApi },
        { provide: EmergencyContactApiService, useValue: emergencyContactApi },
        { provide: MedicalHistoryApiService, useValue: medicalHistoryApi },
        { provide: BloodTestApiService, useValue: bloodTestApi },
        { provide: SelectedPatientState, useValue: { selectedPatient: selectedPatient.asReadonly() } },
        { provide: PatientContextCoordinator, useValue: { refreshSelectedPatientAccess: vi.fn().mockReturnValue(of(void 0)) } },
      ],
    });

    TestBed.overrideComponent(AppointmentPackCreate, { set: { template: '' } });
  });

  // Cleans up whichever fixture was created by the current test.
  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  // Checks an appointment pack cannot be generated until the required appointment has been chosen.
  it('requires an appointment before generating a pack', () => {
    createFixture();
    const page = getTestAccess(fixture!.componentInstance);

    page.generate();

    expect(page.form.controls['appointmentId'].touched).toBe(true);
    expect(appointmentPackApi.generateAppointmentPack).not.toHaveBeenCalled();
  });

  // Checks a carer only loads optional resource domains they are actually allowed to view.
  it('loads optional resources only when the selected patient grants their view permission', () => {
    selectedPatient.set(createCarerContext([
      'patient-record:view',
      'appointment-pack:view',
      'appointment-pack:create',
      'appointment:view',
      'medication:view',
    ]));

    createFixture();

    expect(appointmentApi.getAppointments).toHaveBeenCalledWith('patient-1');
    expect(medicationApi.getMedications).toHaveBeenCalledWith('patient-1');
    expect(healthcareContactApi.getHealthcareContacts).not.toHaveBeenCalled();
    expect(emergencyContactApi.getEmergencyContacts).not.toHaveBeenCalled();
    expect(medicalHistoryApi.getMedicalHistory).not.toHaveBeenCalled();
    expect(bloodTestApi.getBloodTests).not.toHaveBeenCalled();
  });

  // Checks set-backed selection removes duplicates while request IDs still follow the resource list order shown by the app.
  it('submits selected resource IDs once and in source-list order', () => {
    createFixture();
    const page = getTestAccess(fixture!.componentInstance);
    page.form.patchValue({ appointmentId: 'appointment-1' });

    // Select in a different order and select one medication twice to prove the request is based on the source list + Set.
    page.toggleMedication('medication-c', checkedEvent(true));
    page.toggleMedication('medication-b', checkedEvent(true));
    page.toggleMedication('medication-c', checkedEvent(true));
    page.generate();

    expect(appointmentPackApi.generateAppointmentPack).toHaveBeenCalledWith('patient-1', expect.objectContaining({
      appointmentId: 'appointment-1',
      medicationIds: ['medication-b', 'medication-c'],
      healthcareContactIds: [],
      emergencyContactIds: [],
      medicalHistoryEntryIds: [],
      bloodTestIds: [],
    }));
  });

  // Creates and renders the component only after each test has finished adjusting its selected-patient context.
  function createFixture(): void {
    fixture = TestBed.createComponent(AppointmentPackCreate);
    fixture.detectChanges();
  }
});

interface AppointmentPackCreateTestAccess {
  form: FormGroup;
  generate(): void;
  toggleMedication(id: string, event: Event): void;
}

// Exposes the protected form/actions used by this focused component test without relying on the HTML template.
function getTestAccess(component: AppointmentPackCreate): AppointmentPackCreateTestAccess {
  return component as unknown as AppointmentPackCreateTestAccess;
}

// Creates a checkbox-style event for the component's existing selection handler.
function checkedEvent(checked: boolean): Event {
  return { target: { checked } } as unknown as Event;
}

// Creates the user's own patient context, which has inherent frontend access to patient-scoped features.
function createSelfContext(): SelectedPatientContext {
  return {
    patientRecordId: 'patient-1',
    profileId: 'profile-1',
    userId: 'user-1',
    firstName: 'Test',
    lastName: 'Patient',
    contextType: 'SELF',
    permissions: new Set(),
  };
}

// Creates a shared patient context with only the explicit permissions being tested.
function createCarerContext(permissions: readonly Permission[]): SelectedPatientContext {
  return {
    patientRecordId: 'patient-1',
    profileId: 'profile-1',
    userId: 'patient-user-1',
    firstName: 'Shared',
    lastName: 'Patient',
    contextType: 'CARER',
    permissions: new Set(permissions),
  };
}

// Creates the appointment required by every generated appointment pack.
function createAppointment(): AppointmentResponse {
  return {
    id: 'appointment-1',
    patientRecordId: 'patient-1',
    date: '2026-08-25',
    startTime: '09:30:00',
    endTime: null,
    service: 'Neurology',
    appointmentType: null,
    clinicianOrTeam: null,
    locationName: null,
    address: null,
    notes: null,
    sourceDocumentId: null,
    archivedAt: null,
  };
}

// Creates medications in a deliberate order so the generated request ordering can be checked.
function createMedications(): MedicationResponse[] {
  return [
    createMedication('medication-b'),
    createMedication('medication-a'),
    createMedication('medication-c'),
  ];
}

// Creates a minimal medication response used in appointment-pack selection.
function createMedication(id: string): MedicationResponse {
  return {
    id,
    patientRecordId: 'patient-1',
    name: id,
    dose: null,
    form: null,
    instructions: null,
    startDate: null,
    endDate: null,
    notes: null,
    archivedAt: null,
    createdAt: '2026-08-18T00:00:00Z',
    updatedAt: '2026-08-18T00:00:00Z',
  };
}

// Creates the successful pack response returned after generation.
function createPackResponse(): AppointmentPackResponse {
  return {
    id: 'pack-1',
    patientRecordId: 'patient-1',
    appointmentId: 'appointment-1',
    title: 'Appointment Pack',
    notes: null,
    generatedByUserId: 'user-1',
    generatedAt: '2026-08-18T00:00:00Z',
    fileName: 'appointment-pack.pdf',
    fileSize: 2000,
    archivedAt: null,
    items: [],
  };
}
