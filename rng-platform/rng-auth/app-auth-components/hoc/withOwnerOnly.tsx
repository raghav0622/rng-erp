'use client';

import type { ComponentType } from 'react';
import { OwnerOnly } from '../guards/OwnerOnly';

/**
 * HOC that restricts component to owner role only
 *
 * Convenience wrapper for withRoleGuard with owner-only restriction.
 *
 * @example
 * const OwnerDashboard = withOwnerOnly(Dashboard);
 */
export function withOwnerOnly<P extends object>(Component: ComponentType<P>) {
  const WrappedComponent = (props: P) => {
    return (
      <OwnerOnly>
        <Component {...props} />
      </OwnerOnly>
    );
  };

  WrappedComponent.displayName = `withOwnerOnly(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default withOwnerOnly;
