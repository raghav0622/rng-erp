/**
 * Role helper utilities for auth components
 * Provides role-related logic and RBAC checks
 */

import { AppUser } from '@/rng-platform';

export type AppUserRole = 'owner' | 'manager' | 'employee' | 'client';

/**
 * Role hierarchy levels (higher = more privileges)
 */
const ROLE_HIERARCHY: Record<AppUserRole, number> = {
  owner: 4,
  manager: 3,
  employee: 2,
  client: 1,
};

/**
 * Get role color for badges
 * @param role - User role
 * @returns Mantine color name
 */
export function getRoleColor(role: AppUserRole | string): string {
  switch (role) {
    case 'owner':
      return 'red';
    case 'manager':
      return 'blue';
    case 'employee':
      return 'green';
    case 'client':
      return 'gray';
    default:
      return 'gray';
  }
}

/**
 * Get role display label
 * @param role - User role
 * @returns Display label
 */
export function getRoleLabel(role: AppUserRole | string): string {
  if (!role) return 'Unknown';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get role hierarchy level
 * @param role - User role
 * @returns Hierarchy level (higher = more privileges)
 */
export function getRoleLevel(role: AppUserRole | string): number {
  return ROLE_HIERARCHY[role as AppUserRole] || 0;
}

/**
 * Check if user has at least a certain role level
 * @param user - AppUser object
 * @param minimumRole - Minimum required role
 * @returns True if user has sufficient privileges
 */
export function hasMinimumRole(
  user: AppUser | null | undefined,
  minimumRole: AppUserRole,
): boolean {
  if (!user) return false;
  return getRoleLevel(user.role) >= getRoleLevel(minimumRole);
}

/**
 * Check if user is owner
 * @param user - AppUser object
 * @returns True if user is owner
 */
export function isOwner(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'owner';
}

/**
 * Check if user is manager or above
 * @param user - AppUser object
 * @returns True if user is manager or owner
 */
export function isManagerOrAbove(user: AppUser | null | undefined): boolean {
  return hasMinimumRole(user, 'manager');
}

/**
 * Check if user is employee or above
 * @param user - AppUser object
 * @returns True if user is employee, manager, or owner
 */
export function isEmployeeOrAbove(user: AppUser | null | undefined): boolean {
  return hasMinimumRole(user, 'employee');
}

/**
 * Check if user can manage another user (RBAC check)
 * @param actor - User performing the action
 * @param target - User being acted upon
 * @returns True if actor can manage target
 */
export function canManageUser(
  actor: AppUser | null | undefined,
  target: AppUser | null | undefined,
): boolean {
  if (!actor || !target) return false;

  // Owner can manage everyone except themselves
  if (isOwner(actor)) {
    return !isOwner(target);
  }

  // Managers can manage employees and clients
  if (isManagerOrAbove(actor)) {
    return getRoleLevel(target.role) < getRoleLevel('manager');
  }

  return false;
}

/**
 * Check if user can update another user's role
 * @param actor - User performing the action
 * @param target - User whose role is being changed
 * @param newRole - New role to assign
 * @returns True if actor can change target's role
 */
export function canUpdateUserRole(
  actor: AppUser | null | undefined,
  target: AppUser | null | undefined,
  newRole: AppUserRole,
): boolean {
  if (!actor || !target) return false;

  // Cannot change owner role (immutable)
  if (isOwner(target)) return false;

  // Owner can assign any role (except owner)
  if (isOwner(actor)) {
    return newRole !== 'owner';
  }

  // Managers cannot promote to manager or owner
  if (isManagerOrAbove(actor)) {
    return getRoleLevel(newRole) < getRoleLevel('manager');
  }

  return false;
}

/**
 * Check if user can invite new users
 * @param user - AppUser object
 * @returns True if user can invite
 */
export function canInviteUsers(user: AppUser | null | undefined): boolean {
  return isManagerOrAbove(user);
}

/**
 * Check if user can delete another user
 * @param actor - User performing the action
 * @param target - User being deleted
 * @returns True if actor can delete target
 */
export function canDeleteUser(
  actor: AppUser | null | undefined,
  target: AppUser | null | undefined,
): boolean {
  if (!actor || !target) return false;

  // Owner cannot be deleted
  if (isOwner(target)) return false;

  // Owner can delete anyone (except themselves)
  if (isOwner(actor)) {
    return actor.id !== target.id;
  }

  // Managers can delete employees and clients
  if (isManagerOrAbove(actor)) {
    return getRoleLevel(target.role) < getRoleLevel('manager');
  }

  return false;
}

/**
 * Get all roles below a certain level
 * @param role - Maximum role level
 * @returns Array of roles below the given role
 */
export function getRolesBelowLevel(role: AppUserRole): AppUserRole[] {
  const level = getRoleLevel(role);
  return (Object.keys(ROLE_HIERARCHY) as AppUserRole[]).filter((r) => getRoleLevel(r) < level);
}

/**
 * Get all assignable roles for a user
 * @param user - User who will assign the role
 * @returns Array of roles the user can assign
 */
export function getAssignableRoles(user: AppUser | null | undefined): AppUserRole[] {
  if (!user) return [];

  if (isOwner(user)) {
    return ['manager', 'employee', 'client'];
  }

  if (isManagerOrAbove(user)) {
    return ['employee', 'client'];
  }

  return [];
}

/**
 * Sort users by role hierarchy (owner first, client last)
 * @param users - Array of users
 * @returns Sorted array
 */
export function sortUsersByRole(users: AppUser[]): AppUser[] {
  return [...users].sort((a, b) => {
    return getRoleLevel(b.role) - getRoleLevel(a.role);
  });
}
