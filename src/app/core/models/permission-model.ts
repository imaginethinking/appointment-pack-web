export const PERMISSION_CATALOG = {
  'patient-record': ['view', 'edit'],
} as const;

export type PermissionResource = keyof typeof PERMISSION_CATALOG;

export type PermissionAction<R extends PermissionResource = PermissionResource> = (typeof PERMISSION_CATALOG)[R][number];

export type Permission = {
  [R in PermissionResource]: `${R}:${PermissionAction<R>}`;
}[PermissionResource];

export interface PermissionRequirement<R extends PermissionResource = PermissionResource> {
  resource: R;
  action: PermissionAction<R>;
}

export function buildPermission<R extends PermissionResource>(resource: R, action: PermissionAction<R>,): `${R}:${PermissionAction<R>}` {
  return `${resource}:${action}` as `${R}:${PermissionAction<R>}`;
}
