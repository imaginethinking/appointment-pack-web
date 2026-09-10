// Appointment review contains patient-specific extracted clinical/administrative text.
// These tests protect the patient-switch safety rule and confirm that reviewed form values are submitted.

import {signal, WritableSignal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormBuilder} from '@angular/forms';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {of} from 'rxjs';

import {AppointmentResponse} from '../../../appointments/models/appointment-model';
import {SelectedPatientContext} from '../../../patient-context/models/selected-patient-context';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {DocumentProcessingResultResponse, DocumentResponse} from '../../models/document-model';
import {DocumentApiService} from '../../services/document-api-service';
import {AppointmentReview} from './appointment-review';

describe('AppointmentReview', () => {
  let fixture: ComponentFixture<AppointmentReview>;
  let selectedPatient: WritableSignal<SelectedPatientContext | null>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let documentApi: {
    getDocument: ReturnType<typeof vi.fn>;
    getDocumentProcessing: ReturnType<typeof vi.fn>;
    confirmAppointment: ReturnType<typeof vi.fn>;
    rejectAppointment: ReturnType<typeof vi.fn>;
  };

  // Builds the review page with one selected patient and synchronous fake document API responses.
  beforeEach(() => {
    selectedPatient = signal(createPatientContext('patient-1'));
    router = { navigate: vi.fn().mockResolvedValue(true) };
    documentApi = {
      getDocument: vi.fn().mockReturnValue(of(createDocument())),
      getDocumentProcessing: vi.fn().mockReturnValue(of(createProcessingResult())),
      confirmAppointment: vi.fn().mockReturnValue(of(createAppointment())),
      rejectAppointment: vi.fn().mockReturnValue(of(createProcessingResult())),
    };

    TestBed.configureTestingModule({
      imports: [AppointmentReview],
      providers: [
        FormBuilder,
        PatientContextAuthorisation,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ documentId: 'document-1' }) } } },
        { provide: Router, useValue: router },
        { provide: DocumentApiService, useValue: documentApi },
        { provide: SelectedPatientState, useValue: { selectedPatient: selectedPatient.asReadonly() } },
        { provide: PatientContextCoordinator, useValue: { refreshSelectedPatientAccess: vi.fn().mockReturnValue(of(void 0)) } },
      ],
    });

    // The template itself is not under test here, so an empty template keeps the test focused on page behaviour.
    TestBed.overrideComponent(AppointmentReview, { set: { template: '' } });
    fixture = TestBed.createComponent(AppointmentReview);
    fixture.detectChanges();
  });

  // Resets Angular after each component test so signals and injected mocks cannot leak into the next test.
  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  // Checks that changing to another patient immediately removes the previous patient's loaded document information.
  it('clears appointment review state and redirects when the selected patient changes', () => {
    const page = getTestAccess(fixture.componentInstance);

    expect(page.document()).not.toBeNull();
    expect(page.processing()).not.toBeNull();

    selectedPatient.set(createPatientContext('patient-2'));
    fixture.detectChanges();

    expect(page.document()).toBeNull();
    expect(page.processing()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/documents']);
  });

  // Checks the user-edited appointment values, rather than the original extraction suggestions, are confirmed.
  it('submits the reviewed appointment form values', () => {
    const page = getTestAccess(fixture.componentInstance);
    page.form.patchValue({
      date: '2026-09-01',
      startTime: '14:00',
      endTime: '14:45',
      service: 'Edited neurology service',
      notes: 'Bring medication list',
    });

    page.confirm();

    expect(documentApi.confirmAppointment).toHaveBeenCalledWith('document-1', expect.objectContaining({
      date: '2026-09-01',
      startTime: '14:00',
      endTime: '14:45',
      service: 'Edited neurology service',
      notes: 'Bring medication list',
    }));
  });
});

interface AppointmentReviewTestAccess {
  document: () => DocumentResponse | null;
  processing: () => DocumentProcessingResultResponse | null;
  form: {
    patchValue(value: Record<string, unknown>): void;
  };
  confirm(): void;
}

// Exposes only the protected page members needed to test behaviour without depending on the HTML template.
function getTestAccess(component: AppointmentReview): AppointmentReviewTestAccess {
  return component as unknown as AppointmentReviewTestAccess;
}

// Creates the selected patient context used by the review page.
function createPatientContext(patientRecordId: string): SelectedPatientContext {
  return {
    patientRecordId,
    profileId: `profile-${patientRecordId}`,
    userId: `user-${patientRecordId}`,
    firstName: 'Test',
    lastName: 'Patient',
    contextType: 'SELF',
    permissions: new Set(),
  };
}

// Creates an appointment letter that is ready for human review.
function createDocument(): DocumentResponse {
  return {
    id: 'document-1',
    patientRecordId: 'patient-1',
    documentType: 'APPOINTMENT_LETTER',
    status: 'READY_FOR_APPOINTMENT_REVIEW',
    originalFileName: 'appointment.pdf',
    contentType: 'application/pdf',
    fileSize: 1200,
    createdAt: '2026-08-18T00:00:00Z',
  };
}

// Creates the extracted appointment suggestions returned by the document-processing endpoint.
function createProcessingResult(): DocumentProcessingResultResponse {
  return {
    documentId: 'document-1',
    documentType: 'APPOINTMENT_LETTER',
    status: 'READY_FOR_APPOINTMENT_REVIEW',
    extractedText: 'Synthetic appointment letter text',
    machineDeidentifiedText: null,
    approvedDeidentifiedText: null,
    appointmentDetails: {
      date: '2026-08-25',
      startTime: '09:30:00',
      endTime: null,
      service: 'Neurology',
      appointmentType: 'Outpatient appointment',
      clinicianOrTeam: 'Neurology team',
      locationName: 'Example Hospital',
      address: null,
    },
    generatedSummary: null,
    reviewedSummary: null,
    summarySource: null,
    processingWarning: null,
    processorVersion: 'test-version',
    model: null,
    appointmentReviewedByUserId: null,
    appointmentReviewedAt: null,
    deidentificationReviewedByUserId: null,
    deidentificationReviewedAt: null,
    summaryReviewedByUserId: null,
    summaryReviewedAt: null,
  };
}

// Creates the successful appointment response used after confirmation.
function createAppointment(): AppointmentResponse {
  return {
    id: 'appointment-1',
    patientRecordId: 'patient-1',
    date: '2026-09-01',
    startTime: '14:00:00',
    endTime: '14:45:00',
    service: 'Edited neurology service',
    appointmentType: null,
    clinicianOrTeam: null,
    locationName: null,
    address: null,
    notes: 'Bring medication list',
    sourceDocumentId: 'document-1',
    archivedAt: null,
  };
}
