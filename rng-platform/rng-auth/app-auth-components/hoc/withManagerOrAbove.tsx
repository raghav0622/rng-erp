'use client';

import type { ComponentType } from 'react';
import { ManagerOrAbove } from '../guards/ManagerOrAbove';

/**
 * HOC that restricts component to manager and owner roles
 *
 * Convenience wrapper for management-level access.
 *
 * @example
 * const ManagementDashboard = withManagerOrAbove(Dashboard);
 */
export function withManagerOrAbove<P extends object>(Component: ComponentType<P>) {
  const WrappedComponent = (props: P) => {
    return (
      <ManagerOrAbove>
        <Component {...props} />
      </ManagerOrAbove>
    );
  };

  WrappedComponent.displayName = `withManagerOrAbove(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default withManagerOrAbove;
