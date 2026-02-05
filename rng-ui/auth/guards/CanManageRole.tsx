'use client';

import type { ReactNode } from 'react';
import { useRequireAuthenticated } from '../../app-auth-hooks/index';
import type {
  AppUser,
  AppUserRole,
} from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthEmptyState } from '../boundaries/AuthEmptyState';

/**
 * Role management hierarchy
 * Defines which roles can manage/change to which roles
 *
 * POLICY:
 * - Owner: Can assign/manage manager, employee, client (cannot reassign owner)
 * - Manager: FEATURE-ONLY. Cannot manage ANY roles. Treated as elevated employees.
 *   Managers have elevated feature access but zero role management permissions.
 * - Employee: Cannot manage any roles
 * - Client: Cannot manage any roles
 */
const canManageRoles: Record<AppUser['role'], AppUser['role'][]> = {
  owner: ['manager', 'employee', 'client'],
  manager: [], // Managers are feature-only, cannot manage any roles
  employee: [],
  client: [],
};

export interface CanManageRoleProps {
  /**
   * Target role to be managed/changed to
   */
  targetRole: AppUser['role'];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * CanManageRole guard - Role hierarchy-based authorization
 *
 * Features:
 * - Checks if current user can manage/assign a specific role
 * - Requires RequireAuthenticated parent
 * - Uses role hierarchy for permission matrix
 * - Shows fallback UI if role management not permitted
 *
 * Role Management Hierarchy:
 * - owner: Can manage manager, employee, client (cannot reassign owner)
 * - manager: FEATURE-ONLY. Cannot manage any roles. Treated as elevated employees.
 * - employee: Cannot manage any roles
 * - client: Cannot manage any roles
 *
 * Authorization Hierarchy:
 * 1. RequireAuthenticated (account state check) - enforced by this guard
 * 2. Role management permission check (canManageRoles[role]) - this guard
 * 3. Feature access (may require additional validation)
 *
 * @example
 * <CanManageRole targetRole={newRole}>
 *   <ChangeRoleForm />
 * </CanManageRole>
 *
 * @example
 * <CanManageRole targetRole="manager" fallback={<span>Cannot assign manager role</span>}>
 *   <PromoteToManagerButton />
 * </CanManageRole>
 */
export function CanManageRole({ targetRole, children, fallback }: CanManageRoleProps) {
  const currentUser = useRequireAuthenticated();

  // Check if user's role can manage the target role
  const canManage = canManageRoles[currentUser.role as AppUserRole]?.includes(targetRole) || false;

  if (!canManage) {
    return (
      fallback || (
        <AuthEmptyState
          title="Access Denied"
          description={`You cannot manage the ${targetRole} role`}
        />
      )
    );
  }

  return <>{children}</>;
}

export default CanManageRole;
