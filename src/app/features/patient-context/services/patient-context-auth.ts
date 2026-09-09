import { Injectable } from '@angular/core';

import {
  buildPermission,
  Permission,
  PermissionAction,
  PERMISSION_DEPENDENCIES,
  PermissionResource,
} from '../../../core/models/permission-model';
import { SelectedPatientContext } from '../models/selected-patient-context';

/**
 * Checks the permissions available for the selected patient context.
 */
@Injectable({
  providedIn: 'root',
})
export class PatientContextAuthorisation {
  /**
   * Checks whether the selected patient context can use the requested permission.
   */
  has(context: SelectedPatientContext | null, permission: Permission): boolean {
    if (context === null) {
      return false;
    }

    if (context.contextType === 'SELF') {
      return true;
    }

    return context.permissions.has(permission);
  }

  /**
   * Checks whether the selected patient context has every requested permission.
   */
  hasAll(context: SelectedPatientContext | null, permissions: readonly Permission[]): boolean {
    return permissions.every((permission) => this.has(context, permission));
  }

  /**
   * Checks whether the selected patient context has at least one requested permission.
   */
  hasAny(context: SelectedPatientContext | null, permissions: readonly Permission[]): boolean {
    return permissions.some((permission) => this.has(context, permission));
  }

  /**
   * Checks whether an action is allowed including any permissions it depends on.
   */
  can<R extends PermissionResource>(context: SelectedPatientContext | null, resource: R, action: PermissionAction<R>): boolean {
    const permission = buildPermission(resource, action) as Permission;
    return this.hasWithDependencies(context, permission, new Set());
  }

  /**
   * Checks a permission and each of its required permissions while avoiding repeated checks.
   */
  private hasWithDependencies(context: SelectedPatientContext | null, permission: Permission, visited: Set<Permission>): boolean {
    if (!this.has(context, permission)) {
      return false;
    }

    if (visited.has(permission)) {
      return true;
    }

    visited.add(permission);

    return (PERMISSION_DEPENDENCIES[permission] ?? []).every(
      (dependency) => this.hasWithDependencies(context, dependency, visited),
    );
  }
}
