// De-identification review is the privacy checkpoint before consultation text can be summarised.
// These tests protect both the exact reviewed-text submission and removal of old patient data after a context switch.

import {signal, WritableSignal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {FormBuilder, FormGroup} from '@angular/forms';
import {ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {of} from 'rxjs';

import {SelectedPatientContext} from '../../../patient-context/models/selected-patient-context';
import {PatientContextAuthorisation} from '../../../patient-context/services/patient-context-auth';
import {PatientContextCoordinator} from '../../../patient-context/services/patient-context-coordinator';
import {SelectedPatientState} from '../../../patient-context/services/selected-patient-state';
import {DocumentProcessingResultResponse, DocumentResponse} from '../../models/document-model';
import {DocumentApiService} from '../../services/document-api-service';
import {DeidentificationReview} from './deidentification-review';

describe('DeidentificationReview', () => {
  let fixture: ComponentFixture<DeidentificationReview>;
  let selectedPatient: WritableSignal<SelectedPatientContext | null>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let documentApi: {
    getDocument: ReturnType<typeof vi.fn>;
    getDocumentProcessing: ReturnType<typeof vi.fn>;
    summariseDocument: ReturnType<typeof vi.fn>;
  };

  // Creates a ready privacy-review page using synthetic consultation text and a selected patient signal.
  beforeEach(() => {
    selectedPatient = signal(createPatientContext('patient-1'));
    router = { navigate: vi.fn().mockResolvedValue(true) };
    documentApi = {
      getDocument: vi.fn().mockReturnValue(of(createDocument())),
      getDocumentProcessing: vi.fn().mockReturnValue(of(createProcessingResult())),
      summariseDocument: vi.fn().mockReturnValue(of({
        ...createProcessingResult(),
        status: 'READY_FOR_SUMMARY_REVIEW',
        approvedDeidentifiedText: 'Approved text',
        generatedSummary: 'Generated summary',
        summarySource: 'OPENAI',
      })),
    };

    TestBed.configureTestingModule({
      imports: [DeidentificationReview],
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

    TestBed.overrideComponent(DeidentificationReview, { set: { template: '' } });
    fixture = TestBed.createComponent(DeidentificationReview);
    fixture.detectChanges();
  });

  // Destroys the component and its effects so the selected-patient signal does not affect another test.
  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  // Checks the exact text reviewed by the user is sent for summarisation, including deliberate spacing/edits.
  it('submits the exact approved de-identified text after explicit approval', () => {
    const page = getTestAccess(fixture.componentInstance);
    const reviewedText = '  Reviewed consultation text with [REDACTED] retained  ';

    page.form.controls['approvedDeidentifiedText'].setValue(reviewedText);
    page.form.controls['externalTransmissionApproved'].setValue(true);
    page.submit();

    expect(documentApi.summariseDocument).toHaveBeenCalledWith('document-1', {
      approvedDeidentifiedText: reviewedText,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/documents', 'document-1', 'summary-review']);
  });

  // Checks switching patient removes both the document and consultation processing text from this page.
  it('clears de-identification review state and redirects when the selected patient changes', () => {
    const page = getTestAccess(fixture.componentInstance);

    expect(page.document()).not.toBeNull();
    expect(page.processing()).not.toBeNull();

    selectedPatient.set(createPatientContext('patient-2'));
    fixture.detectChanges();

    expect(page.document()).toBeNull();
    expect(page.processing()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/documents']);
  });
});

interface DeidentificationReviewTestAccess {
  document: () => DocumentResponse | null;
  processing: () => DocumentProcessingResultResponse | null;
  form: FormGroup;
  submit(): void;
}

// Exposes the small amount of protected component state needed for behavioural testing.
function getTestAccess(component: DeidentificationReview): DeidentificationReviewTestAccess {
  return component as unknown as DeidentificationReviewTestAccess;
}

// Creates the patient context that owns the synthetic consultation document.
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

// Creates a consultation outcome letter waiting for de-identification review.
function createDocument(): DocumentResponse {
  return {
    id: 'document-1',
    patientRecordId: 'patient-1',
    documentType: 'CONSULTATION_OUTCOME_LETTER',
    status: 'READY_FOR_DEIDENTIFICATION_REVIEW',
    originalFileName: 'consultation.pdf',
    contentType: 'application/pdf',
    fileSize: 1400,
    createdAt: '2026-08-18T00:00:00Z',
  };
}

// Creates the local machine-de-identified text shown to the user before approval.
function createProcessingResult(): DocumentProcessingResultResponse {
  return {
    documentId: 'document-1',
    documentType: 'CONSULTATION_OUTCOME_LETTER',
    status: 'READY_FOR_DEIDENTIFICATION_REVIEW',
    extractedText: 'Synthetic original consultation text',
    machineDeidentifiedText: 'Synthetic [REDACTED] consultation text',
    approvedDeidentifiedText: null,
    appointmentDetails: null,
    generatedSummary: null,
    reviewedSummary: null,
    summarySource: null,
    processingWarning: 'Review the text before approval.',
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
