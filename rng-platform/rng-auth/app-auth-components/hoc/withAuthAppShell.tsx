'use client';

import type { ComponentType } from 'react';
import type { AuthAppShellProps } from '../shell/AuthAppShell';
import { AuthAppShell } from '../shell/AuthAppShell';

/**
 * HOC that wraps a component with AuthAppShell
 *
 * Provides automatic route-based auth state routing for any page component.
 *
 * @example
 * const ProtectedPage = withAuthAppShell(DashboardPage);
 *
 * @example With custom routes
 * const ProtectedPage = withAuthAppShell(DashboardPage, {
 *   loadingRoute: '/loading',
 *   unauthenticatedRoute: '/login',
 *   authenticatedRoute: '/app'
 * });
 */
export function withAuthAppShell<P extends object>(
  Component: ComponentType<P>,
  shellProps?: Partial<Omit<AuthAppShellProps, 'children'>>,
) {
  const WrappedComponent = (props: P) => {
    return (
      <AuthAppShell {...shellProps}>
        <Component {...props} />
      </AuthAppShell>
    );
  };

  WrappedComponent.displayName = `withAuthAppShell(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default withAuthAppShell;
