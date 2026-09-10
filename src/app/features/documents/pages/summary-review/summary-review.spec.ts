// Summary review handles both normal AI-assisted review and the manual fallback after summarisation failure.
// The tests below protect approved-text retry behaviour, manual acceptance and patient-context safety.

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
import {SummaryReview} from './summary-review';

describe('SummaryReview', () => {
  let fixture: ComponentFixture<SummaryReview>;
  let selectedPatient: WritableSignal<SelectedPatientContext | null>;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let currentDocument: DocumentResponse;
  let currentProcessing: DocumentProcessingResultResponse;
  let documentApi: {
    getDocument: ReturnType<typeof vi.fn>;
    getDocumentProcessing: ReturnType<typeof vi.fn>;
    summariseDocument: ReturnType<typeof vi.fn>;
    acceptDocumentSummary: ReturnType<typeof vi.fn>;
    rejectDocumentSummary: ReturnType<typeof vi.fn>;
  };

  // Starts each test in SUMMARISATION_FAILED because this state exercises retry and manual recovery behaviour.
  beforeEach(() => {
    selectedPatient = signal(createPatientContext('patient-1'));
    router = { navigate: vi.fn().mockResolvedValue(true) };
    currentDocument = createDocument('SUMMARISATION_FAILED');
    currentProcessing = createProcessingResult('SUMMARISATION_FAILED');

    documentApi = {
      getDocument: vi.fn().mockImplementation(() => of(currentDocument)),
      getDocumentProcessing: vi.fn().mockImplementation(() => of(currentProcessing)),
      summariseDocument: vi.fn().mockReturnValue(of(createProcessingResult('READY_FOR_SUMMARY_REVIEW'))),
      acceptDocumentSummary: vi.fn().mockReturnValue(of(createProcessingResult('READY_FOR_SUMMARY_REVIEW'))),
      rejectDocumentSummary: vi.fn().mockReturnValue(of(createProcessingResult('READY_FOR_SUMMARY_REVIEW'))),
    };

    TestBed.configureTestingModule({
      imports: [SummaryReview],
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

    TestBed.overrideComponent(SummaryReview, { set: { template: '' } });
    fixture = TestBed.createComponent(SummaryReview);
    fixture.detectChanges();
  });

  // Destroys the component after each test so its constructor effect is cleaned up correctly.
  afterEach(() => {
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  // Checks a retry reuses the exact text that was previously approved rather than accepting newly changed text.
  it('retries summarisation with the persisted approved de-identified text', () => {
    const page = getTestAccess(fixture.componentInstance);

    page.retrySummarisation();

    expect(documentApi.summariseDocument).toHaveBeenCalledWith('document-1', {
      approvedDeidentifiedText: 'Previously approved [REDACTED] consultation text',
    });
  });

  // Checks the manual recovery path submits the human-written summary and history metadata after an AI failure.
  it('accepts a manual summary after summarisation failure', () => {
    const page = getTestAccess(fixture.componentInstance);
    page.enableManualSummary();
    page.form.patchValue({
      reviewedSummary: '  Manual reviewed consultation summary.  ',
      historyTitle: '  Neurology consultation  ',
      historyDate: '2026-08-17',
    });

    page.accept();

    expect(documentApi.acceptDocumentSummary).toHaveBeenCalledWith('document-1', {
      reviewedSummary: 'Manual reviewed consultation summary.',
      historyTitle: 'Neurology consultation',
      historyDate: '2026-08-17',
    });
  });

  // Checks previously loaded summary/approved text cannot stay on screen after switching to another patient.
  it('clears summary review state and redirects when the selected patient changes', () => {
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

interface SummaryReviewTestAccess {
  document: () => DocumentResponse | null;
  processing: () => DocumentProcessingResultResponse | null;
  form: FormGroup;
  retrySummarisation(): void;
  enableManualSummary(): void;
  accept(): void;
}

// Exposes only the protected methods and state used by the recovery workflow tests.
function getTestAccess(component: SummaryReview): SummaryReviewTestAccess {
  return component as unknown as SummaryReviewTestAccess;
}

// Creates the selected owner context used for document and history permissions in these tests.
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

// Creates a consultation document in either failed or ready-for-summary-review state.
function createDocument(status: DocumentResponse['status']): DocumentResponse {
  return {
    id: 'document-1',
    patientRecordId: 'patient-1',
    documentType: 'CONSULTATION_OUTCOME_LETTER',
    status,
    originalFileName: 'consultation.pdf',
    contentType: 'application/pdf',
    fileSize: 1500,
    createdAt: '2026-08-18T00:00:00Z',
  };
}

// Creates processing state with the approved text retained so retry can use the same privacy-reviewed snapshot.
function createProcessingResult(status: DocumentProcessingResultResponse['status']): DocumentProcessingResultResponse {
  const ready = status === 'READY_FOR_SUMMARY_REVIEW';

  return {
    documentId: 'document-1',
    documentType: 'CONSULTATION_OUTCOME_LETTER',
    status,
    extractedText: 'Synthetic consultation text',
    machineDeidentifiedText: 'Machine [REDACTED] text',
    approvedDeidentifiedText: 'Previously approved [REDACTED] consultation text',
    appointmentDetails: null,
    generatedSummary: ready ? 'Generated consultation summary.' : null,
    reviewedSummary: null,
    summarySource: ready ? 'OPENAI' : null,
    processingWarning: null,
    processorVersion: 'test-version',
    model: ready ? { name: 'test-model', promptVersion: 'test-prompt' } : null,
    appointmentReviewedByUserId: null,
    appointmentReviewedAt: null,
    deidentificationReviewedByUserId: 'reviewer-1',
    deidentificationReviewedAt: '2026-08-18T00:00:00Z',
    summaryReviewedByUserId: null,
    summaryReviewedAt: null,
  };
}
