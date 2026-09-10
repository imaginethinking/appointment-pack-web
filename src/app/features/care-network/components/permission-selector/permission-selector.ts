import {Component, input, output} from '@angular/core';

import {Permission} from '../../../../core/models/permission-model';
import {CARE_NETWORK_PERMISSION_GROUPS} from '../../models/patient-carer-access-model';

/**
 * Contains the permission and selected state produced by the permission selector.
 */
export interface PermissionToggleEvent {
  permission: Permission;
  checked: boolean;
}

/**
 * Displays the available permissions and lets the user change their selection.
 */
@Component({
  selector: 'app-permission-selector',
  templateUrl: './permission-selector.html',
})
export class PermissionSelector {
  readonly selectedPermissions = input.required<ReadonlySet<Permission>>();
  readonly showDescriptions = input(false);
  readonly permissionToggled = output<PermissionToggleEvent>();

  protected readonly permissionGroups = CARE_NETWORK_PERMISSION_GROUPS;

  /**
   * Sends the changed permission and its new selected state to the parent component.
   */
  protected togglePermission(permission: Permission, event: Event): void {
    this.permissionToggled.emit({
      permission,
      checked: (event.target as HTMLInputElement).checked,
    });
  }
}
