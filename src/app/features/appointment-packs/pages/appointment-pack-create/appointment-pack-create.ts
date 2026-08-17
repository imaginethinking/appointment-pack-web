import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, type WritableSignal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, of } from 'rxjs';

import { applyServerFieldErrors, clearServerFieldErrors } from '../../../../core/forms/server-field-errors';
import { getHttpErrorMessage } from '../../../../core/http/http-error-message';
import { hasHttpStatus } from '../../../../core/http/http-problem-detail';
import { formatLocalTime, normaliseOptionalText } from '../../../../shared/utils/formatting';
import { AppointmentResponse } from '../../../appointments/models/appointment-model';
import { AppointmentApiService } from '../../../appointments/services/appointment-api-service';
import { BloodTestResponse } from '../../../blood-results/models/blood-test-model';
import { BloodTestApiService } from '../../../blood-results/services/blood-test-api-service';
import { EmergencyContactResponse } from '../../../contacts/models/emergency-contact-model';
import { HealthcareContactResponse } from '../../../contacts/models/healthcare-contact-model';
import { EmergencyContactApiService } from '../../../contacts/services/emergency-contact-api-service';
import { HealthcareContactApiService } from '../../../contacts/services/healthcare-contact-api-service';
import { MedicalHistoryEntryResponse } from '../../../medical-history/models/medical-history-model';
import { MedicalHistoryApiService } from '../../../medical-history/services/medical-history-api-service';
import { MedicationResponse } from '../../../medications/models/medication-model';
import { MedicationApiService } from '../../../medications/services/medication-api-service';
import { getPatientContextName } from '../../../patient-context/models/selected-patient-context';
import { PatientContextAuthorisation } from '../../../patient-context/services/patient-context-auth';
import { PatientContextCoordinator } from '../../../patient-context/services/patient-context-coordinator';
import { SelectedPatientState } from '../../../patient-context/services/selected-patient-state';
import { AppointmentPackGenerationRequest } from '../../models/appointment-pack-model';
import { AppointmentPackApiService } from '../../services/appointment-pack-api-service';

type AppointmentPackCreateStatus = 'loading' | 'ready' | 'no-patient' | 'forbidden' | 'error';

type SelectionCategory = 'medications' | 'healthcare contacts' | 'emergency contacts' | 'medical history entries' | 'blood tests';

@Component({
  selector: 'app-appointment-pack-create',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './appointment-pack-create.html',
})
export class AppointmentPackCreate {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly appointmentPackApi = inject(AppointmentPackApiService);
  private readonly appointmentApi = inject(AppointmentApiService);
  private readonly medicationApi = inject(MedicationApiService);
  private readonly healthcareContactApi = inject(HealthcareContactApiService);
  private readonly emergencyContactApi = inject(EmergencyContactApiService);
  private readonly medicalHistoryApi = inject(MedicalHistoryApiService);
  private readonly bloodTestApi = inject(BloodTestApiService);
  private readonly selectedPatientState = inject(SelectedPatientState);
  private readonly authorisation = inject(PatientContextAuthorisation);
  private readonly patientContextCoordinator = inject(PatientContextCoordinator);
  private readonly reloadVersion = signal(0);

  protected readonly selectedPatient = this.selectedPatientState.selectedPatient;
  protected readonly status = signal<AppointmentPackCreateStatus>('loading');
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly selectionError = signal('');
  protected readonly successMessage = signal('');
  protected readonly isGenerating = signal(false);

  protected readonly appointments = signal<readonly AppointmentResponse[]>([]);
  protected readonly medications = signal<readonly MedicationResponse[]>([]);
  protected readonly healthcareContacts = signal<readonly HealthcareContactResponse[]>([]);
  protected readonly emergencyContacts = signal<readonly EmergencyContactResponse[]>([]);
  protected readonly medicalHistoryEntries = signal<readonly MedicalHistoryEntryResponse[]>([]);
  protected readonly bloodTests = signal<readonly BloodTestResponse[]>([]);

  protected readonly selectedMedicationIds = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedHealthcareContactIds = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedEmergencyContactIds = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedMedicalHistoryEntryIds = signal<ReadonlySet<string>>(new Set());
  protected readonly selectedBloodTestIds = signal<ReadonlySet<string>>(new Set());

  protected readonly canCreatePack = computed(() => this.authorisation.can(this.selectedPatient(), 'appointment-pack', 'create'));
  protected readonly canViewAppointments = computed(() => this.authorisation.can(this.selectedPatient(), 'appointment', 'view'));
  protected readonly canEditAppointments = computed(() => this.authorisation.can(this.selectedPatient(), 'appointment', 'edit'));
  protected readonly canViewMedications = computed(() => this.authorisation.can(this.selectedPatient(), 'medication', 'view'));
  protected readonly canViewContacts = computed(() => this.authorisation.can(this.selectedPatient(), 'contact', 'view'));
  protected readonly canViewHistory = computed(() => this.authorisation.can(this.selectedPatient(), 'history', 'view'));
  protected readonly canViewBloodResults = computed(() => this.authorisation.can(this.selectedPatient(), 'blood-result', 'view'));
  protected readonly selectedPatientName = computed(() => {
    const selectedPatient = this.selectedPatient();
    return selectedPatient === null ? '' : getPatientContextName(selectedPatient);
  });

  protected readonly form = this.formBuilder.group({
    appointmentId: this.formBuilder.nonNullable.control('', Validators.required),
    title: this.formBuilder.nonNullable.control('', Validators.maxLength(250)),
    notes: this.formBuilder.nonNullable.control('', Validators.maxLength(2000)),
  });

  protected readonly formatLocalTime = formatLocalTime;

  constructor() {
    effect((onCleanup) => {
      this.reloadVersion();
      const selectedPatient = this.selectedPatient();

      this.resetPageState();

      if (selectedPatient === null) {
        this.status.set('no-patient');
        return;
      }

      if (!this.authorisation.can(selectedPatient, 'appointment-pack', 'create')) {
        this.status.set('forbidden');
        return;
      }

      this.status.set('loading');

      const subscription = forkJoin({
        appointments: this.authorisation.can(selectedPatient, 'appointment', 'view')
          ? this.appointmentApi.getAppointments(selectedPatient.patientRecordId)
          : of([] as AppointmentResponse[]),
        medications: this.authorisation.can(selectedPatient, 'medication', 'view')
          ? this.medicationApi.getMedications(selectedPatient.patientRecordId)
          : of([] as MedicationResponse[]),
        healthcareContacts: this.authorisation.can(selectedPatient, 'contact', 'view')
          ? this.healthcareContactApi.getHealthcareContacts(selectedPatient.patientRecordId)
          : of([] as HealthcareContactResponse[]),
        emergencyContacts: this.authorisation.can(selectedPatient, 'contact', 'view')
          ? this.emergencyContactApi.getEmergencyContacts(selectedPatient.patientRecordId)
          : of([] as EmergencyContactResponse[]),
        medicalHistoryEntries: this.authorisation.can(selectedPatient, 'history', 'view')
          ? this.medicalHistoryApi.getMedicalHistory(selectedPatient.patientRecordId)
          : of([] as MedicalHistoryEntryResponse[]),
        bloodTests: this.authorisation.can(selectedPatient, 'blood-result', 'view')
          ? this.bloodTestApi.getBloodTests(selectedPatient.patientRecordId)
          : of([] as BloodTestResponse[]),
      }).subscribe({
        next: (resources) => {
          this.appointments.set(resources.appointments);
          this.medications.set(resources.medications);
          this.healthcareContacts.set(resources.healthcareContacts);
          this.emergencyContacts.set(resources.emergencyContacts);
          this.medicalHistoryEntries.set(resources.medicalHistoryEntries);
          this.bloodTests.set(resources.bloodTests);
          this.status.set('ready');
        },
        error: (error: unknown) => this.handleLoadError(error),
      });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  protected retry(): void {
    this.reloadVersion.update((version) => version + 1);
  }

  protected toggleMedication(id: string, event: Event): void {
    this.updateSelection(this.selectedMedicationIds, id, this.isChecked(event), 'medications');
  }

  protected toggleHealthcareContact(id: string, event: Event): void {
    this.updateSelection(this.selectedHealthcareContactIds, id, this.isChecked(event), 'healthcare contacts');
  }

  protected toggleEmergencyContact(id: string, event: Event): void {
    this.updateSelection(this.selectedEmergencyContactIds, id, this.isChecked(event), 'emergency contacts');
  }

  protected toggleMedicalHistoryEntry(id: string, event: Event): void {
    this.updateSelection(this.selectedMedicalHistoryEntryIds, id, this.isChecked(event), 'medical history entries');
  }

  protected toggleBloodTest(id: string, event: Event): void {
    this.updateSelection(this.selectedBloodTestIds, id, this.isChecked(event), 'blood tests');
  }

  protected generate(): void {
    this.actionError.set('');
    this.selectionError.set('');
    this.successMessage.set('');
    clearServerFieldErrors(this.form);

    const selectedPatient = this.selectedPatient();

    if (selectedPatient === null || !this.canCreatePack()) {
      this.actionError.set('Your current access does not allow appointment packs to be created.');
      return;
    }

    if (!this.canViewAppointments()) {
      this.actionError.set('Appointment information is not available with your current access.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const patientRecordId = selectedPatient.patientRecordId;
    this.isGenerating.set(true);

    this.appointmentPackApi.generateAppointmentPack(patientRecordId, this.buildRequest()).pipe(
      finalize(() => this.isGenerating.set(false)),
    ).subscribe({
      next: (appointmentPack) => {
        if (this.selectedPatient()?.patientRecordId !== appointmentPack.patientRecordId) {
          this.successMessage.set('The appointment pack was generated successfully, but the selected patient changed before generation completed.');
          return;
        }

        void this.router.navigate(['/appointment-packs', appointmentPack.id]);
      },
      error: (error: unknown) => this.handleGenerateError(error, patientRecordId),
    });
  }

  private isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  private buildRequest(): AppointmentPackGenerationRequest {
    const value = this.form.getRawValue();

    return {
      appointmentId: value.appointmentId,
      title: normaliseOptionalText(value.title),
      notes: normaliseOptionalText(value.notes),
      medicationIds: this.medications().filter((medication) => this.selectedMedicationIds().has(medication.id)).map((medication) => medication.id),
      healthcareContactIds: this.healthcareContacts().filter((contact) => this.selectedHealthcareContactIds().has(contact.id)).map((contact) => contact.id),
      emergencyContactIds: this.emergencyContacts().filter((contact) => this.selectedEmergencyContactIds().has(contact.id)).map((contact) => contact.id),
      medicalHistoryEntryIds: this.medicalHistoryEntries().filter((entry) => this.selectedMedicalHistoryEntryIds().has(entry.id)).map((entry) => entry.id),
      bloodTestIds: this.bloodTests().filter((bloodTest) => this.selectedBloodTestIds().has(bloodTest.id)).map((bloodTest) => bloodTest.id),
    };
  }

  private updateSelection(selection: WritableSignal<ReadonlySet<string>>, id: string, checked: boolean, category: SelectionCategory): void {
    this.selectionError.set('');
    const nextSelection = new Set(selection());

    if (checked) {
      if (nextSelection.size >= 100 && !nextSelection.has(id)) {
        this.selectionError.set(`You can select up to 100 ${category} for one appointment pack.`);
        return;
      }

      nextSelection.add(id);
    } else {
      nextSelection.delete(id);
    }

    selection.set(nextSelection);
  }

  private handleLoadError(error: unknown): void {
    if (hasHttpStatus(error, 403)) {
      this.status.set('loading');
      this.refreshPatientAccess(null);
      return;
    }

    if (hasHttpStatus(error, 404)) {
      this.status.set('error');
      this.errorMessage.set('The selected patient record is no longer available.');
      this.refreshPatientAccess(null);
      return;
    }

    this.status.set('error');
    this.errorMessage.set(getHttpErrorMessage(error, 'Unable to load appointment pack information.'));
  }

  private handleGenerateError(error: unknown, failedPatientRecordId: string): void {
    if (applyServerFieldErrors(this.form, error)) {
      return;
    }

    if (hasHttpStatus(error, 400)) {
      this.actionError.set(getHttpErrorMessage(error, 'One or more selected resources cannot be included in the appointment pack.'));
      return;
    }

    if (hasHttpStatus(error, 403) || hasHttpStatus(error, 404)) {
      this.refreshPatientAccess(failedPatientRecordId);
      return;
    }

    this.actionError.set(getHttpErrorMessage(error, 'Unable to generate the appointment pack.'));
  }

  private refreshPatientAccess(failedPatientRecordId: string | null): void {
    this.patientContextCoordinator.refreshSelectedPatientAccess().subscribe({
      next: () => {
        const selectedPatient = this.selectedPatient();

        if (failedPatientRecordId !== null && selectedPatient?.patientRecordId !== failedPatientRecordId) {
          void this.router.navigate(['/appointment-packs']);
          return;
        }

        if (!this.canCreatePack()) {
          this.status.set('forbidden');
          return;
        }

        if (failedPatientRecordId === null) {
          this.status.set('error');
          this.errorMessage.set('Your access changed while the appointment information was loading. Please try again.');
          return;
        }

        this.actionError.set('Your access or selected information changed. Reload the page before trying again.');
      },
      error: (refreshError: unknown) => {
        if (failedPatientRecordId === null) {
          this.status.set('error');
          this.errorMessage.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.'));
          return;
        }

        this.actionError.set(getHttpErrorMessage(refreshError, 'Unable to refresh patient access.'));
      },
    });
  }

  private resetPageState(): void {
    this.form.reset({ appointmentId: '', title: '', notes: '' });
    this.appointments.set([]);
    this.medications.set([]);
    this.healthcareContacts.set([]);
    this.emergencyContacts.set([]);
    this.medicalHistoryEntries.set([]);
    this.bloodTests.set([]);
    this.selectedMedicationIds.set(new Set());
    this.selectedHealthcareContactIds.set(new Set());
    this.selectedEmergencyContactIds.set(new Set());
    this.selectedMedicalHistoryEntryIds.set(new Set());
    this.selectedBloodTestIds.set(new Set());
    this.errorMessage.set('');
    this.actionError.set('');
    this.selectionError.set('');
    this.successMessage.set('');
  }
}
