import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { mfaLoginGuard } from './core/guards/mfa-login-guard';
import { patientContextLoadGuard } from './core/guards/patient-context-load-guard';
import { selectedPatientPermissionGuard } from './core/guards/selected-patient-permission-guard';
import { Login } from './features/auth/pages/login/login';
import { MfaLogin } from './features/auth/pages/mfa-login/mfa-login';
import { Register } from './features/auth/pages/register/register';
import { CareNetwork } from './features/care-network/pages/care-network/care-network';
import { CarerAccess } from './features/care-network/pages/carer-access/carer-access';
import { AccessDenied } from './features/errors/pages/access-denied/access-denied';
import { Home } from './features/home/pages/home/home';
import { PatientRecord } from './features/patient-record/pages/patient-record/patient-record';
import { PatientRecordCreate } from './features/patient-record/pages/patient-record-create/patient-record-create';
import { PatientRecordEdit } from './features/patient-record/pages/patient-record-edit/patient-record-edit';
import { MfaSettings } from './features/profile/pages/mfa-settings/mfa-settings';
import { Profile } from './features/profile/pages/profile/profile';
import { ProfileEdit } from './features/profile/pages/profile-edit/profile-edit';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
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
        path: 'access-denied',
        component: AccessDenied,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
