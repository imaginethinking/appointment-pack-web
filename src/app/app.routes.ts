import { Routes } from '@angular/router';

import { Register } from './features/auth/pages/register/register';
import {MfaLogin} from './features/auth/pages/mfa-login/mfa-login';
import {mfaLoginGuard} from './core/guards/mfa-login-guard';
import {Login} from './features/auth/pages/login/login';
import {Home} from './features/home/pages/home/home';
import {authGuard} from './core/guards/auth-guard';

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
    path: '**',
    redirectTo: 'login',
  },
];
