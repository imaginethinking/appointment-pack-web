import { Component, input } from '@angular/core';

import { Permission } from '../../../../core/models/permission-model';
import { CARE_NETWORK_PERMISSION_GROUPS, CareNetworkPermissionOption } from '../../models/patient-carer-access-model';

@Component({
  selector: 'app-permission-badges',
  templateUrl: './permission-badges.html',
})
export class PermissionBadges {
  readonly permissions = input.required<readonly Permission[]>();

  protected readonly permissionOptions = CARE_NETWORK_PERMISSION_GROUPS.flatMap<CareNetworkPermissionOption>(
    (group) => group.permissions,
  );

  protected hasPermission(permission: Permission): boolean {
    return this.permissions().includes(permission);
  }
}
