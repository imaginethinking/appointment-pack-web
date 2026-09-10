import { Routes } from '@angular/router';

import { adminGuard } from './core/guards/admin-guard';
import { authGuard } from './core/guards/auth-guard';
import { mfaLoginGuard } from './core/guards/mfa-login-guard';
import { patientContextLoadGuard } from './core/guards/patient-context-load-guard';
import { selectedPatientPermissionGuard } from './core/guards/selected-patient-permission-guard';

export const routes: Routes = [
  // Public account pages that can be opened without signing in.
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/pages/landing/landing').then((module) => module.Landing),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/pages/register/register').then((module) => module.Register),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login').then((module) => module.Login),
  },
  {
    path: 'login/mfa',
    loadComponent: () => import('./features/auth/pages/mfa-login/mfa-login').then((module) => module.MfaLogin),
    canActivate: [mfaLoginGuard],
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/pages/verify-email/verify-email').then((module) => module.VerifyEmail),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password').then((module) => module.ForgotPassword),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/pages/reset-password/reset-password').then((module) => module.ResetPassword),
  },

  // Signed in pages share the same session and patient context loading.
  {
    path: '',
    canActivate: [authGuard, patientContextLoadGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/pages/home/home').then((module) => module.Home),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/pages/profile/profile').then((module) => module.Profile),
      },
      {
        path: 'profile/edit',
        loadComponent: () => import('./features/profile/pages/profile-edit/profile-edit').then((module) => module.ProfileEdit),
      },
      {
        path: 'profile/settings/mfa',
        loadComponent: () => import('./features/profile/pages/mfa-settings/mfa-settings').then((module) => module.MfaSettings),
      },
      {
        path: 'patient',
        loadComponent: () => import('./features/patient-record/pages/patient-record/patient-record').then((module) => module.PatientRecord),
      },
      {
        path: 'patient/create',
        loadComponent: () => import('./features/patient-record/pages/patient-record-create/patient-record-create').then((module) => module.PatientRecordCreate),
      },
      {
        path: 'patient/edit',
        loadComponent: () => import('./features/patient-record/pages/patient-record-edit/patient-record-edit').then((module) => module.PatientRecordEdit),
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
        loadComponent: () => import('./features/documents/pages/document-list/document-list').then((module) => module.DocumentList),
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
        loadComponent: () => import('./features/documents/pages/document-upload/document-upload').then((module) => module.DocumentUpload),
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
        loadComponent: () => import('./features/documents/pages/appointment-review/appointment-review').then((module) => module.AppointmentReview),
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
        loadComponent: () => import('./features/documents/pages/deidentification-review/deidentification-review').then((module) => module.DeidentificationReview),
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
        loadComponent: () => import('./features/documents/pages/summary-review/summary-review').then((module) => module.SummaryReview),
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
        loadComponent: () => import('./features/documents/pages/document-details/document-details').then((module) => module.DocumentDetails),
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
        loadComponent: () => import('./features/appointments/pages/appointment-list/appointment-list').then((module) => module.AppointmentList),
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
        loadComponent: () => import('./features/appointments/pages/appointment-create/appointment-create').then((module) => module.AppointmentCreate),
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
        loadComponent: () => import('./features/appointments/pages/appointment-edit/appointment-edit').then((module) => module.AppointmentEdit),
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
        loadComponent: () => import('./features/appointments/pages/appointment-details/appointment-details').then((module) => module.AppointmentDetails),
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
        loadComponent: () => import('./features/appointment-packs/pages/appointment-pack-list/appointment-pack-list').then((module) => module.AppointmentPackList),
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
        loadComponent: () => import('./features/appointment-packs/pages/appointment-pack-create/appointment-pack-create').then((module) => module.AppointmentPackCreate),
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'appointment-pack',
            action: 'create',
          },
        },
      },
      {
        path: 'appointment-packs/:appointmentPackId/preview',
        loadComponent: () => import('./features/appointment-packs/pages/appointment-pack-preview/appointment-pack-preview').then((module) => module.AppointmentPackPreview),
        canActivate: [selectedPatientPermissionGuard],
        data: {
          permission: {
            resource: 'appointment-pack',
            action: 'view',
          },
        },
      },
      {
        path: 'appointment-packs/:appointmentPackId',
        loadComponent: () => import('./features/appointment-packs/pages/appointment-pack-details/appointment-pack-details').then((module) => module.AppointmentPackDetails),
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
        loadComponent: () => import('./features/medications/pages/medication-list/medication-list').then((module) => module.MedicationList),
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
        loadComponent: () => import('./features/medications/pages/medication-create/medication-create').then((module) => module.MedicationCreate),
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
        loadComponent: () => import('./features/medications/pages/medication-edit/medication-edit').then((module) => module.MedicationEdit),
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
        loadComponent: () => import('./features/medications/pages/medication-details/medication-details').then((module) => module.MedicationDetails),
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
        loadComponent: () => import('./features/contacts/pages/contact-list/contact-list').then((module) => module.ContactList),
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
        loadComponent: () => import('./features/contacts/pages/healthcare-contact-create/healthcare-contact-create').then((module) => module.HealthcareContactCreate),
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
        loadComponent: () => import('./features/contacts/pages/healthcare-contact-edit/healthcare-contact-edit').then((module) => module.HealthcareContactEdit),
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
        loadComponent: () => import('./features/contacts/pages/healthcare-contact-details/healthcare-contact-details').then((module) => module.HealthcareContactDetails),
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
        loadComponent: () => import('./features/contacts/pages/emergency-contact-create/emergency-contact-create').then((module) => module.EmergencyContactCreate),
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
        loadComponent: () => import('./features/contacts/pages/emergency-contact-edit/emergency-contact-edit').then((module) => module.EmergencyContactEdit),
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
        loadComponent: () => import('./features/contacts/pages/emergency-contact-details/emergency-contact-details').then((module) => module.EmergencyContactDetails),
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
        loadComponent: () => import('./features/blood-results/pages/blood-test-list/blood-test-list').then((module) => module.BloodTestList),
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
        loadComponent: () => import('./features/blood-results/pages/blood-test-create/blood-test-create').then((module) => module.BloodTestCreate),
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
        loadComponent: () => import('./features/blood-results/pages/blood-test-edit/blood-test-edit').then((module) => module.BloodTestEdit),
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
        loadComponent: () => import('./features/blood-results/pages/blood-test-details/blood-test-details').then((module) => module.BloodTestDetails),
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
        loadComponent: () => import('./features/medical-history/pages/medical-history/medical-history').then((module) => module.MedicalHistory),
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
        loadComponent: () => import('./features/medical-history/pages/medical-history-create/medical-history-create').then((module) => module.MedicalHistoryCreate),
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
        loadComponent: () => import('./features/medical-history/pages/medical-history-edit/medical-history-edit').then((module) => module.MedicalHistoryEdit),
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
        loadComponent: () => import('./features/medical-history/pages/medical-history-details/medical-history-details').then((module) => module.MedicalHistoryDetails),
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
        loadComponent: () => import('./features/audit/pages/patient-audit/patient-audit').then((module) => module.PatientAudit),
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
            loadComponent: () => import('./features/care-network/pages/care-network/care-network').then((module) => module.CareNetwork),
          },
          {
            path: 'patients',
            loadComponent: () => import('./features/care-network/pages/carer-access/carer-access').then((module) => module.CarerAccess),
          },
        ],
      },
      {
        path: 'admin/analytics/events',
        loadComponent: () => import('./features/admin-analytics/pages/admin-analytics-events/admin-analytics-events').then((module) => module.AdminAnalyticsEvents),
        canActivate: [adminGuard],
      },
      {
        path: 'admin/analytics',
        loadComponent: () => import('./features/admin-analytics/pages/admin-analytics-summary/admin-analytics-summary').then((module) => module.AdminAnalyticsSummary),
        canActivate: [adminGuard],
      },
      {
        path: 'access-denied',
        loadComponent: () => import('./features/errors/pages/access-denied/access-denied').then((module) => module.AccessDenied),
      },
    ],
  },
  {
    path: 'not-found',
    loadComponent: () => import('./features/errors/pages/not-found/not-found').then((module) => module.NotFound),
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];
