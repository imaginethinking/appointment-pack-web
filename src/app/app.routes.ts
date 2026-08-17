import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin-guard';
import { authGuard } from './core/guards/auth-guard';
import { mfaLoginGuard } from './core/guards/mfa-login-guard';
import { patientContextLoadGuard } from './core/guards/patient-context-load-guard';
import { selectedPatientPermissionGuard } from './core/guards/selected-patient-permission-guard';
import { AdminAnalyticsEvents } from './features/admin-analytics/pages/admin-analytics-events/admin-analytics-events';
import { AdminAnalyticsSummary } from './features/admin-analytics/pages/admin-analytics-summary/admin-analytics-summary';
import { AppointmentPackCreate } from './features/appointment-packs/pages/appointment-pack-create/appointment-pack-create';
import { AppointmentPackDetails } from './features/appointment-packs/pages/appointment-pack-details/appointment-pack-details';
import { AppointmentPackList } from './features/appointment-packs/pages/appointment-pack-list/appointment-pack-list';
import { AppointmentCreate } from './features/appointments/pages/appointment-create/appointment-create';
import { AppointmentDetails } from './features/appointments/pages/appointment-details/appointment-details';
import { AppointmentEdit } from './features/appointments/pages/appointment-edit/appointment-edit';
import { AppointmentList } from './features/appointments/pages/appointment-list/appointment-list';
import { PatientAudit } from './features/audit/pages/patient-audit/patient-audit';
import { ForgotPassword } from './features/auth/pages/forgot-password/forgot-password';
import { Login } from './features/auth/pages/login/login';
import { MfaLogin } from './features/auth/pages/mfa-login/mfa-login';
import { Register } from './features/auth/pages/register/register';
import { ResetPassword } from './features/auth/pages/reset-password/reset-password';
import { VerifyEmail } from './features/auth/pages/verify-email/verify-email';
import { BloodTestCreate } from './features/blood-results/pages/blood-test-create/blood-test-create';
import { BloodTestDetails } from './features/blood-results/pages/blood-test-details/blood-test-details';
import { BloodTestEdit } from './features/blood-results/pages/blood-test-edit/blood-test-edit';
import { BloodTestList } from './features/blood-results/pages/blood-test-list/blood-test-list';
import { CareNetwork } from './features/care-network/pages/care-network/care-network';
import { CarerAccess } from './features/care-network/pages/carer-access/carer-access';
import { ContactList } from './features/contacts/pages/contact-list/contact-list';
import { EmergencyContactCreate } from './features/contacts/pages/emergency-contact-create/emergency-contact-create';
import { EmergencyContactDetails } from './features/contacts/pages/emergency-contact-details/emergency-contact-details';
import { EmergencyContactEdit } from './features/contacts/pages/emergency-contact-edit/emergency-contact-edit';
import { HealthcareContactCreate } from './features/contacts/pages/healthcare-contact-create/healthcare-contact-create';
import { HealthcareContactDetails } from './features/contacts/pages/healthcare-contact-details/healthcare-contact-details';
import { HealthcareContactEdit } from './features/contacts/pages/healthcare-contact-edit/healthcare-contact-edit';
import { AppointmentReview } from './features/documents/pages/appointment-review/appointment-review';
import { DeidentificationReview } from './features/documents/pages/deidentification-review/deidentification-review';
import { DocumentDetails } from './features/documents/pages/document-details/document-details';
import { DocumentList } from './features/documents/pages/document-list/document-list';
import { DocumentUpload } from './features/documents/pages/document-upload/document-upload';
import { SummaryReview } from './features/documents/pages/summary-review/summary-review';
import { AccessDenied } from './features/errors/pages/access-denied/access-denied';
import { NotFound } from './features/errors/pages/not-found/not-found';
import { Home } from './features/home/pages/home/home';
import { Landing } from './features/landing/pages/landing/landing';
import { MedicalHistoryCreate } from './features/medical-history/pages/medical-history-create/medical-history-create';
import { MedicalHistoryDetails } from './features/medical-history/pages/medical-history-details/medical-history-details';
import { MedicalHistoryEdit } from './features/medical-history/pages/medical-history-edit/medical-history-edit';
import { MedicalHistory } from './features/medical-history/pages/medical-history/medical-history';
import { MedicationCreate } from './features/medications/pages/medication-create/medication-create';
import { MedicationDetails } from './features/medications/pages/medication-details/medication-details';
import { MedicationEdit } from './features/medications/pages/medication-edit/medication-edit';
import { MedicationList } from './features/medications/pages/medication-list/medication-list';
import { PatientRecordCreate } from './features/patient-record/pages/patient-record-create/patient-record-create';
import { PatientRecordEdit } from './features/patient-record/pages/patient-record-edit/patient-record-edit';
import { PatientRecord } from './features/patient-record/pages/patient-record/patient-record';
import { MfaSettings } from './features/profile/pages/mfa-settings/mfa-settings';
import { ProfileEdit } from './features/profile/pages/profile-edit/profile-edit';
import { Profile } from './features/profile/pages/profile/profile';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: Landing,
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'login/mfa',
    component: MfaLogin,
    canActivate: [mfaLoginGuard],
  },
  {
    path: 'verify-email',
    component: VerifyEmail,
  },
  {
    path: 'forgot-password',
    component: ForgotPassword,
  },
  {
    path: 'reset-password',
    component: ResetPassword,
  },
  {
    path: '',
    canActivate: [authGuard, patientContextLoadGuard],
    children: [
      {
        path: 'home',
        component: Home,
      },
      {
        path: 'profile',
        component: Profile,
      },
      {
        path: 'profile/edit',
        component: ProfileEdit,
      },
      {
        path: 'profile/settings/mfa',
        component: MfaSettings,
      },
      {
        path: 'patient',
        component: PatientRecord,
      },
      {
        path: 'patient/create',
        component: PatientRecordCreate,
      },
      {
        path: 'patient/edit',
        component: PatientRecordEdit,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'patient-record',
            action: 'edit',
          },
        },
      },
      {
        path: 'documents',
        component: DocumentList,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'document',
            action: 'view',
          },
        },
      },
      {
        path: 'documents/upload',
        component: DocumentUpload,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'document',
            action: 'upload',
          },
        },
      },
      {
        path: 'documents/:documentId/appointment-review',
        component: AppointmentReview,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'document',
            action: 'edit',
          },
        },
      },
      {
        path: 'documents/:documentId/deidentification-review',
        component: DeidentificationReview,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'document',
            action: 'edit',
          },
        },
      },
      {
        path: 'documents/:documentId/summary-review',
        component: SummaryReview,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'document',
            action: 'edit',
          },
        },
      },
      {
        path: 'documents/:documentId',
        component: DocumentDetails,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'document',
            action: 'view',
          },
        },
      },
      {
        path: 'appointments',
        component: AppointmentList,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'appointment',
            action: 'view',
          },
        },
      },
      {
        path: 'appointments/create',
        component: AppointmentCreate,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'appointment',
            action: 'edit',
          },
        },
      },
      {
        path: 'appointments/:appointmentId/edit',
        component: AppointmentEdit,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'appointment',
            action: 'edit',
          },
        },
      },
      {
        path: 'appointments/:appointmentId',
        component: AppointmentDetails,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'appointment',
            action: 'view',
          },
        },
      },
      {
        path: 'appointment-packs',
        component: AppointmentPackList,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'appointment-pack',
            action: 'view',
          },
        },
      },
      {
        path: 'appointment-packs/create',
        component: AppointmentPackCreate,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'appointment-pack',
            action: 'create',
          },
        },
      },
      {
        path: 'appointment-packs/:appointmentPackId',
        component: AppointmentPackDetails,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'appointment-pack',
            action: 'view',
          },
        },
      },
      {
        path: 'medications',
        component: MedicationList,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'medication',
            action: 'view',
          },
        },
      },
      {
        path: 'medications/create',
        component: MedicationCreate,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'medication',
            action: 'edit',
          },
        },
      },
      {
        path: 'medications/:medicationId/edit',
        component: MedicationEdit,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'medication',
            action: 'edit',
          },
        },
      },
      {
        path: 'medications/:medicationId',
        component: MedicationDetails,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'medication',
            action: 'view',
          },
        },
      },
      {
        path: 'contacts',
        component: ContactList,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'contact',
            action: 'view',
          },
        },
      },
      {
        path: 'contacts/healthcare/create',
        component: HealthcareContactCreate,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'contact',
            action: 'edit',
          },
        },
      },
      {
        path: 'contacts/healthcare/:contactId/edit',
        component: HealthcareContactEdit,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'contact',
            action: 'edit',
          },
        },
      },
      {
        path: 'contacts/healthcare/:contactId',
        component: HealthcareContactDetails,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'contact',
            action: 'view',
          },
        },
      },
      {
        path: 'contacts/emergency/create',
        component: EmergencyContactCreate,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'contact',
            action: 'edit',
          },
        },
      },
      {
        path: 'contacts/emergency/:contactId/edit',
        component: EmergencyContactEdit,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'contact',
            action: 'edit',
          },
        },
      },
      {
        path: 'contacts/emergency/:contactId',
        component: EmergencyContactDetails,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'contact',
            action: 'view',
          },
        },
      },
      {
        path: 'blood-results',
        component: BloodTestList,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'blood-result',
            action: 'view',
          },
        },
      },
      {
        path: 'blood-results/create',
        component: BloodTestCreate,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'blood-result',
            action: 'edit',
          },
        },
      },
      {
        path: 'blood-results/:bloodTestId/edit',
        component: BloodTestEdit,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'blood-result',
            action: 'edit',
          },
        },
      },
      {
        path: 'blood-results/:bloodTestId',
        component: BloodTestDetails,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'blood-result',
            action: 'view',
          },
        },
      },
      {
        path: 'medical-history',
        component: MedicalHistory,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'history',
            action: 'view',
          },
        },
      },
      {
        path: 'medical-history/create',
        component: MedicalHistoryCreate,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'history',
            action: 'edit',
          },
        },
      },
      {
        path: 'medical-history/:entryId/edit',
        component: MedicalHistoryEdit,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'history',
            action: 'edit',
          },
        },
      },
      {
        path: 'medical-history/:entryId',
        component: MedicalHistoryDetails,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'history',
            action: 'view',
          },
        },
      },
      {
        path: 'activity-history',
        component: PatientAudit,
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'audit',
            action: 'view',
          },
        },
      },
      {
        path: 'care-network',
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'carers',
          },
          {
            path: 'carers',
            component: CareNetwork,
          },
          {
            path: 'patients',
            component: CarerAccess,
          },
        ],
      },
      {
        path: 'admin/analytics/events',
        component: AdminAnalyticsEvents,
        canActivate: [adminGuard],
      },
      {
        path: 'admin/analytics',
        component: AdminAnalyticsSummary,
        canActivate: [adminGuard],
      },
      {
        path: 'access-denied',
        component: AccessDenied,
      },
    ],
  },
  {
    path: 'not-found',
    component: NotFound,
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];
