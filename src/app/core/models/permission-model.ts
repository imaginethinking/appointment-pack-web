/**
 * Defines the patient permission resources
 */
export const PERMISSION_CATALOG = {
  'patient-record': ['view', 'edit'],
  document: ['view', 'edit', 'upload'],
  appointment: ['view', 'edit'],
  medication: ['view', 'edit'],
  contact: ['view', 'edit'],
  'blood-result': ['view', 'edit'],
  history: ['view', 'edit'],
  'appointment-pack': ['view', 'create'],
  audit: ['view'],
} as const;

export type PermissionResource = keyof typeof PERMISSION_CATALOG;
export type PermissionAction<R extends PermissionResource = PermissionResource> = (typeof PERMISSION_CATALOG)[R][number];

export type Permission = {
  [R in PermissionResource]: `${R}:${PermissionAction<R>}`;
}[PermissionResource];

/**
 * Describes the patient permission required by a route or feature.
 */
export interface PermissionRequirement<R extends PermissionResource = PermissionResource> {
  resource: R;
  action: PermissionAction<R>;
}

/**
 * Holds the display information and prerequisite permissions used by the
 * permission editor.
 */
export interface PermissionOption {
  permission: Permission;
  label: string;
  description: string;
  dependencies: readonly Permission[];
}

/**
 * Groups related permissions for presentation in the Care Network interface.
 */
export interface PermissionGroup {
  resource: PermissionResource;
  label: string;
  permissions: readonly PermissionOption[];
}

/**
 * Defines the permission options shown to users together with their direct
 * prerequisite permissions.
 */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = [
  {
    resource: 'patient-record',
    label: 'Patient record',
    permissions: [
      permissionOption('patient-record', 'view', 'View patient record', 'View patient details and healthcare information.'),
      permissionOption('patient-record', 'edit', 'Edit patient record', 'Update patient details and healthcare information.', ['patient-record:view']),
    ],
  },
  {
    resource: 'document',
    label: 'Documents',
    permissions: [
      permissionOption('document', 'view', 'View documents', 'View and download the patient’s documents.', ['patient-record:view']),
      permissionOption('document', 'edit', 'Review documents', 'Process, review and archive documents.', ['document:view']),
      permissionOption('document', 'upload', 'Upload documents', 'Add documents to the patient record.', ['document:edit']),
    ],
  },
  {
    resource: 'appointment',
    label: 'Appointments',
    permissions: [
      permissionOption('appointment', 'view', 'View appointments', 'View the patient’s appointments.', ['patient-record:view']),
      permissionOption('appointment', 'edit', 'Manage appointments', 'Add, update, archive and confirm appointments.', ['appointment:view']),
    ],
  },
  {
    resource: 'medication',
    label: 'Medications',
    permissions: [
      permissionOption('medication', 'view', 'View medications', 'View the patient’s medications.', ['patient-record:view']),
      permissionOption('medication', 'edit', 'Manage medications', 'Add, update and archive medications.', ['medication:view']),
    ],
  },
  {
    resource: 'contact',
    label: 'Contacts',
    permissions: [
      permissionOption('contact', 'view', 'View contacts', 'View healthcare and emergency contacts.', ['patient-record:view']),
      permissionOption('contact', 'edit', 'Manage contacts', 'Add, update and archive healthcare and emergency contacts.', ['contact:view']),
    ],
  },
  {
    resource: 'blood-result',
    label: 'Blood results',
    permissions: [
      permissionOption('blood-result', 'view', 'View blood results', 'View blood tests and results.', ['patient-record:view']),
      permissionOption('blood-result', 'edit', 'Manage blood results', 'Add, update and archive blood tests.', ['blood-result:view']),
    ],
  },
  {
    resource: 'history',
    label: 'Medical history',
    permissions: [
      permissionOption('history', 'view', 'View medical history', 'View the patient’s medical history.', ['patient-record:view']),
      permissionOption('history', 'edit', 'Manage medical history', 'Add, update and archive medical history entries.', ['history:view']),
    ],
  },
  {
    resource: 'appointment-pack',
    label: 'Appointment packs',
    permissions: [
      permissionOption('appointment-pack', 'view', 'View appointment packs', 'View and download appointment packs.', ['patient-record:view']),
      permissionOption('appointment-pack', 'create', 'Create appointment packs', 'Create and archive appointment packs.', ['appointment-pack:view']),
    ],
  },
  {
    resource: 'audit',
    label: 'Activity history',
    permissions: [
      permissionOption('audit', 'view', 'View activity history', 'View important activity recorded for the patient.', ['patient-record:view']),
    ],
  },
];

/**
 * Provides the direct prerequisite permissions for each permission.
 */
export const PERMISSION_DEPENDENCIES: Readonly<Partial<Record<Permission, readonly Permission[]>>> = buildPermissionDependencies();

/**
 * Provides the reverse dependency lookup used when removing permissions.
 */
export const PERMISSION_DEPENDENTS: Readonly<Partial<Record<Permission, readonly Permission[]>>> = buildPermissionDependents();

/**
 * Builds the permission string for a resource and action.
 */
export function buildPermission<R extends PermissionResource>(resource: R, action: PermissionAction<R>): `${R}:${PermissionAction<R>}` {
  return `${resource}:${action}` as `${R}:${PermissionAction<R>}`;
}

/**
 * Returns a new permission set containing the requested permission and all
 * of its required prerequisites.
 */
export function addPermissionWithDependencies(selectedPermissions: ReadonlySet<Permission>, permission: Permission): ReadonlySet<Permission> {
  const permissions = new Set(selectedPermissions);
  addPermission(permissions, permission);
  return permissions;
}

/**
 * Returns a new permission set with the requested permission and anything
 * that depends on it removed.
 */
export function removePermissionWithDependents(selectedPermissions: ReadonlySet<Permission>, permission: Permission): ReadonlySet<Permission> {
  const permissions = new Set(selectedPermissions);
  removePermission(permissions, permission);
  return permissions;
}

/**
 * Builds the display metadata for a permission and its direct prerequisites.
 */
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

/**
 * Builds the prerequisite lookup from the permission groups defined above.
 */
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

/**
 * Builds the reverse lookup used to find permissions that depend on another
 * permission.
 */
function buildPermissionDependents(): Partial<Record<Permission, readonly Permission[]>> {
  const dependents: Partial<Record<Permission, Permission[]>> = {};

  for (const group of PERMISSION_GROUPS) {
    for (const option of group.permissions) {
      for (const dependency of option.dependencies) {
        dependents[dependency] = [...(dependents[dependency] ?? []), option.permission];
      }
    }
  }

  return dependents;
}

/**
 * Adds a permission to the working set and recursively includes its prerequisites.
 */
function addPermission(permissions: Set<Permission>, permission: Permission): void {
  permissions.add(permission);

  for (const dependency of PERMISSION_DEPENDENCIES[permission] ?? []) {
    addPermission(permissions, dependency);
  }
}

/**
 * Recursively removes permissions that depend on the requested permission
 * before removing the permission itself.
 */
function removePermission(permissions: Set<Permission>, permission: Permission): void {
  for (const dependent of PERMISSION_DEPENDENTS[permission] ?? []) {
    removePermission(permissions, dependent);
  }

  permissions.delete(permission);
}
