'use client';

import type { ComponentType, ReactNode } from 'react';
import type { AppUserRole } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { RequireRole } from '../guards/RequireRole';

export interface WithRoleGuardOptions {
  /**
   * Allowed roles
   */
  allow: AppUserRole[];
  /**
   * Fallback UI when role not allowed
   */
  fallback?: ReactNode;
}

/**
 * HOC that wraps a component with role-based access control
 *
 * Restricts component access to specified roles only.
 * Throws NotAuthorizedError if user doesn't have required role.
 *
 * @example
 * const AdminPanel = withRoleGuard(Panel, { allow: ['owner', 'manager'] });
 *
 * @example With fallback
 * const AdminPanel = withRoleGuard(Panel, {
 *   allow: ['owner'],
 *   fallback: <Text>Access denied</Text>
 * });
 */
export function withRoleGuard<P extends object>(
  Component: ComponentType<P>,
  options: WithRoleGuardOptions,
) {
  const WrappedComponent = (props: P) => {
    return (
      <RequireRole allow={options.allow} fallback={options.fallback}>
        <Component {...props} />
      </RequireRole>
    );
  };

  WrappedComponent.displayName = `withRoleGuard(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default withRoleGuard;
