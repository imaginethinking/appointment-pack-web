import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { mfaLoginGuard } from './core/guards/mfa-login-guard';
import { Login } from './features/auth/pages/login/login';
import { MfaLogin } from './features/auth/pages/mfa-login/mfa-login';
import { Register } from './features/auth/pages/register/register';
import { Home } from './features/home/pages/home/home';
import { Profile } from './features/profile/pages/profile/profile';
import { ProfileEdit } from './features/profile/pages/profile-edit/profile-edit';
import { MfaSettings } from './features/profile/pages/mfa-settings/mfa-settings';

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
    path: 'home',
    component: Home,
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard],
  },
  {
    path: 'profile/edit',
    component: ProfileEdit,
    canActivate: [authGuard],
  },
  {
    path: 'profile/settings/mfa',
    component: MfaSettings,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
