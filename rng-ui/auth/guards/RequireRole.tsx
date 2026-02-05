'use client';

import type { ReactNode } from 'react';
import { useRequireAuthenticated } from '../../app-auth-hooks/useRequireAuthenticated';
import { NotAuthorizedError } from '../../app-auth-service/app-auth.errors';
import type { AppUserRole } from '../../app-auth-service/internal-app-user-service/app-user.contracts';

interface RequireRolePropsBase {
  /**
   * Allowed roles (Phase-1: single role per user)
   */
  allow: AppUserRole[];
  /**
   * Content to render when authorized
   */
  children: ReactNode;
}

interface RequireRolePropsWithFallback extends RequireRolePropsBase {
  /**
   * Fallback UI to render when user is not authorized
   * Set to null to render nothing instead of throwing
   * Set to a component to render custom fallback UI
   */
  fallback: ReactNode;
}

interface RequireRolePropsWithoutFallback extends RequireRolePropsBase {
  fallback?: undefined;
}

export type RequireRoleProps = RequireRolePropsWithFallback | RequireRolePropsWithoutFallback;

/**
 * Guard that requires user to have one of the allowed roles.
 * Throws NotAuthorizedError if user's role is not in the allow list (and no fallback provided).
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
 *
 * @example Conditionally render with fallback
 * <RequireRole allow={['owner']} fallback={null}>
 *   <AdminPanel />
 * </RequireRole>
 */
export function RequireRole(props: RequireRoleProps) {
  // Ensure authenticated and account is active (enabled, not-deleted, activated)
  // This call validates account state; RequireRole only checks role membership
  const user = useRequireAuthenticated();

  // Check if user's role is in the allow list
  const isAllowed = props.allow.includes(user.role);

  if (!isAllowed) {
    // Check if fallback was explicitly provided (even if null)
    if ('fallback' in props) {
      return <>{props.fallback}</>;
    }
    // Throw typed error (caught by AuthErrorBoundary)
    throw new NotAuthorizedError();
  }

  return <>{props.children}</>;
}
