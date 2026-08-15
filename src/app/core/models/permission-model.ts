export const PERMISSION_CATALOG = {
  'patient-record': ['view', 'edit'],
  'document': ['view', 'edit', 'upload'],
  'appointment': ['view', 'edit'],
  'medication': ['view', 'edit'],
  'contact': ['view', 'edit'],
  'blood-result': ['view', 'edit'],
  'history': ['view', 'edit'],
  'appointment-pack': ['view', 'create'],
  'audit': ['view'],
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

export interface PermissionOption {
  permission: Permission;
  label: string;
  description: string;
  dependencies: readonly Permission[];
}

export interface PermissionGroup {
  resource: PermissionResource;
  label: string;
  permissions: readonly PermissionOption[];
}

export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    resource: 'patient-record',
    label: 'Patient record',
    permissions: [
      permissionOption('patient-record', 'view', 'View patient record', 'View patient-record details.'),
      permissionOption('patient-record', 'edit', 'Edit patient record', 'Update patient-record details.', ['patient-record:view']),
    ],
  },
  {
    resource: 'document',
    label: 'Documents',
    permissions: [
      permissionOption('document', 'view', 'View documents', 'View document details and download stored documents.', ['patient-record:view']),
      permissionOption('document', 'edit', 'Process and review documents', 'Process, review and archive documents when allowed.', ['document:view']),
      permissionOption('document', 'upload', 'Upload documents', 'Upload new documents for the patient.', ['document:edit']),
    ],
  },
  {
    resource: 'appointment',
    label: 'Appointments',
    permissions: [
      permissionOption('appointment', 'view', 'View appointments', 'View appointments for the patient.', ['patient-record:view']),
      permissionOption('appointment', 'edit', 'Manage appointments', 'Create, update, archive and confirm appointments.', ['appointment:view']),
    ],
  },
  {
    resource: 'medication',
    label: 'Medications',
    permissions: [
      permissionOption('medication', 'view', 'View medications', 'View the patient’s medication records.', ['patient-record:view']),
      permissionOption('medication', 'edit', 'Manage medications', 'Create, update and archive medication records.', ['medication:view']),
    ],
  },
  {
    resource: 'contact',
    label: 'Contacts',
    permissions: [
      permissionOption('contact', 'view', 'View contacts', 'View healthcare and emergency contacts.', ['patient-record:view']),
      permissionOption('contact', 'edit', 'Manage contacts', 'Create, update and archive healthcare and emergency contacts.', ['contact:view']),
    ],
  },
  {
    resource: 'blood-result',
    label: 'Blood results',
    permissions: [
      permissionOption('blood-result', 'view', 'View blood results', 'View manually recorded blood tests and results.', ['patient-record:view']),
      permissionOption('blood-result', 'edit', 'Manage blood results', 'Create, update and archive blood-test records.', ['blood-result:view']),
    ],
  },
  {
    resource: 'history',
    label: 'Medical history',
    permissions: [
      permissionOption('history', 'view', 'View medical history', 'View medical-history entries.', ['patient-record:view']),
      permissionOption('history', 'edit', 'Manage medical history', 'Create, update, archive and accept medical-history entries.', ['history:view']),
    ],
  },
  {
    resource: 'appointment-pack',
    label: 'Appointment packs',
    permissions: [
      permissionOption('appointment-pack', 'view', 'View appointment packs', 'View and download generated appointment packs.', ['patient-record:view']),
      permissionOption('appointment-pack', 'create', 'Generate appointment packs', 'Generate and archive appointment-pack snapshots.', ['appointment-pack:view']),
    ],
  },
  {
    resource: 'audit',
    label: 'Activity history',
    permissions: [
      permissionOption('audit', 'view', 'View activity history', 'View patient-centred audit activity.', ['patient-record:view']),
    ],
  },
];

export const PERMISSION_DEPENDENCIES: Readonly<Partial<Record<Permission, readonly Permission[]>>> = buildPermissionDependencies();

export function buildPermission<R extends PermissionResource>(resource: R, action: PermissionAction<R>): `${R}:${PermissionAction<R>}` {
  return `${resource}:${action}` as `${R}:${PermissionAction<R>}`;
}

export function addPermissionWithDependencies(selectedPermissions: ReadonlySet<Permission>, permission: Permission): ReadonlySet<Permission> {
  const permissions = new Set(selectedPermissions);
  addPermission(permissions, permission);
  return permissions;
}

function permissionOption<R extends PermissionResource>(
  resource: R,
  action: PermissionAction<R>,
  label: string,
  description: string,
  dependencies: readonly Permission[] = [],
): PermissionOption {
  return {
    permission: buildPermission(resource, action) as Permission,
    label,
    description,
    dependencies,
  };
}

function buildPermissionDependencies(): Partial<Record<Permission, readonly Permission[]>> {
  const dependencies: Partial<Record<Permission, readonly Permission[]>> = {};

  for (const group of PERMISSION_GROUPS) {
    for (const option of group.permissions) {
      if (option.dependencies.length > 0) {
        dependencies[option.permission] = option.dependencies;
      }
    }
  }

  return dependencies;
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
