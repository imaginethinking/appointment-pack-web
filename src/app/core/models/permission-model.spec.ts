// These tests focus on the permission dependency rules used by the care network.
// The aim is to make sure a permission cannot be added or removed in an invalid combination.

import {addPermissionWithDependencies, Permission, PERMISSION_DEPENDENCIES, removePermissionWithDependents} from './permission-model';

describe('permission model', () => {
  // Checks that the frontend dependency catalogue still matches the intended permission rules.
  it('defines the expected prerequisite dependencies for patient-scoped permissions', () => {
    expect(PERMISSION_DEPENDENCIES).toEqual({
      'patient-record:edit': ['patient-record:view'],
      'document:view': ['patient-record:view'],
      'document:edit': ['document:view'],
      'document:upload': ['document:edit'],
      'appointment:view': ['patient-record:view'],
      'appointment:edit': ['appointment:view'],
      'medication:view': ['patient-record:view'],
      'medication:edit': ['medication:view'],
      'contact:view': ['patient-record:view'],
      'contact:edit': ['contact:view'],
      'blood-result:view': ['patient-record:view'],
      'blood-result:edit': ['blood-result:view'],
      'history:view': ['patient-record:view'],
      'history:edit': ['history:view'],
      'appointment-pack:view': ['patient-record:view'],
      'appointment-pack:create': ['appointment-pack:view'],
      'audit:view': ['patient-record:view'],
    });
  });

  // Checks that choosing document upload also adds every permission it depends on.
  it('recursively adds all prerequisites for document upload', () => {
    // Start with no permissions and check that the helper adds the full chain for us.
    const initial = new Set<Permission>();

    const result = addPermissionWithDependencies(initial, 'document:upload');

    expect(result).toEqual(new Set<Permission>([
      'document:upload',
      'document:edit',
      'document:view',
      'patient-record:view',
    ]));
    expect(initial.size).toBe(0);
  });

  // Checks the shorter appointment-pack dependency chain in the same way.
  it('recursively adds appointment-pack prerequisites', () => {
    const result = addPermissionWithDependencies(
      new Set<Permission>(),
      'appointment-pack:create',
    );

    expect(result).toEqual(new Set<Permission>([
      'appointment-pack:create',
      'appointment-pack:view',
      'patient-record:view',
    ]));
  });

  // Checks that removing the root patient permission also removes permissions that can no longer be valid.
  it('removes recursive dependents when a prerequisite is removed', () => {
    // This represents a user with several permissions that all ultimately depend on patient-record:view.
    const selected = new Set<Permission>([
      'patient-record:view',
      'document:view',
      'document:edit',
      'document:upload',
      'appointment:view',
      'appointment:edit',
      'medication:view',
      'medication:edit',
      'appointment-pack:view',
      'appointment-pack:create',
      'audit:view',
    ]);

    const result = removePermissionWithDependents(selected, 'patient-record:view');

    expect(result.size).toBe(0);
    expect(selected.size).toBe(11);
  });

  // Checks that removing one permission branch does not remove unrelated valid permissions.
  it('removes only the relevant dependent branch', () => {
    const selected = new Set<Permission>([
      'patient-record:view',
      'document:view',
      'document:edit',
      'document:upload',
      'appointment:view',
      'appointment:edit',
    ]);

    const result = removePermissionWithDependents(selected, 'document:view');

    expect(result).toEqual(new Set<Permission>([
      'patient-record:view',
      'appointment:view',
      'appointment:edit',
    ]));
  });
});
