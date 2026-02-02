'use client';

import type { ReactNode } from 'react';
import { useRequireAuthenticated } from '../../app-auth-hooks/useRequireAuthenticated';
import { NotAuthorizedError } from '../../app-auth-service/app-auth.errors';
import type { AppUserRole } from '../../app-auth-service/internal-app-user-service/app-user.contracts';

export interface RequireRoleProps {
  /**
   * Allowed roles (Phase-1: single role per user)
   */
  allow: AppUserRole[];
  /**
   * Content to render when authorized
   */
  children: ReactNode;
  /**
   * Optional fallback (if not provided, throws NotAuthorizedError)
   */
  fallback?: ReactNode;
}

/**
 * Guard that requires user to have one of the allowed roles.
 * Throws NotAuthorizedError if user's role is not in the allow list.
 *
 * Phase-1 RBAC: Single role per user (no assignments, no multi-role)
 *
 * DESIGN: This guard checks ONLY role membership.
 * Account state validation (disabled, deleted, activated) belongs to RequireAuthenticated.
 *
 * Parent Guard Requirement:
 * Always wrap inside RequireAuthenticated to also validate account state:
 *
 * <RequireAuthenticated>
 *   <RequireRole allow={['owner']}>
 *     <AdminPanel />
 *   </RequireRole>
 * </RequireAuthenticated>
 *
 * @example Owner-only with full account validation
 * <RequireAuthenticated>
 *   <RequireRole allow={['owner']}>
 *     <AdminPanel />
 *   </RequireRole>
 * </RequireAuthenticated>
 *
 * @example Manager or Owner
 * <RequireAuthenticated>
 *   <RequireRole allow={['owner', 'manager']}>
 *     <TeamManagement />
 *   </RequireRole>
 * </RequireAuthenticated>
 */
export function RequireRole({ allow, children, fallback }: RequireRoleProps) {
  // Ensure authenticated and account is active (enabled, not-deleted, activated)
  // This call validates account state; RequireRole only checks role membership
  const user = useRequireAuthenticated();

  // Check if user's role is in the allow list
  const isAllowed = allow.includes(user.role);

  if (!isAllowed) {
    if (fallback) {
      return <>{fallback}</>;
    }
    // Throw typed error (caught by AuthErrorBoundary)
    throw new NotAuthorizedError();
  }

  return <>{children}</>;
}
