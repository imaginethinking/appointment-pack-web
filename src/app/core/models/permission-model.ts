export const PERMISSION_CATALOG = {
  'patient-record': ['view', 'edit'],
  'document': ['view', 'edit', 'upload'],
  'history': ['view', 'edit'],
} as const;

export type PermissionResource = keyof typeof PERMISSION_CATALOG;

export type PermissionAction<R extends PermissionResource = PermissionResource> =
  (typeof PERMISSION_CATALOG)[R][number];

export type Permission = {
  [R in PermissionResource]: `${R}:${PermissionAction<R>}`;
}[PermissionResource];

export interface PermissionRequirement<R extends PermissionResource = PermissionResource> {
  resource: R;
  action: PermissionAction<R>;
}

export const PERMISSION_DEPENDENCIES: Partial<Record<Permission, readonly Permission[]>> = {
  'patient-record:edit': ['patient-record:view'],
  'document:edit': ['document:view'],
  'document:upload': ['document:edit'],
  'history:edit': ['history:view'],
};

export function buildPermission<R extends PermissionResource>(
  resource: R,
  action: PermissionAction<R>,
): `${R}:${PermissionAction<R>}` {
  return `${resource}:${action}` as `${R}:${PermissionAction<R>}`;
}

export function addPermissionWithDependencies(
  selectedPermissions: ReadonlySet<Permission>,
  permission: Permission,
): ReadonlySet<Permission> {
  const permissions = new Set(selectedPermissions);

  addPermission(permissions, permission);

  return permissions;
}

function addPermission(permissions: Set<Permission>, permission: Permission): void {
  if (permissions.has(permission)) {
    return;
  }

  permissions.add(permission);

  for (const dependency of PERMISSION_DEPENDENCIES[permission] ?? []) {
    addPermission(permissions, dependency);
  }
}
