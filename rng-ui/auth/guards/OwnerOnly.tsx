'use client';

import type { ReactNode } from 'react';
import { RequireRole } from './RequireRole';

export interface OwnerOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * OwnerOnly guard - Restrict component access to owner role only
 *
 * Features:
 * - Restricts access to users with role === 'owner'
 * - Requires RequireAuthenticated parent (enforced via RequireRole)
 * - Shows fallback UI if user doesn't have owner role
 *
 * Authorization Hierarchy:
 * 1. RequireAuthenticated (account state check) - enforced by RequireRole
 * 2. RequireRole check (role === 'owner') - this guard
 * 3. Feature access
 *
 * @example
 * <OwnerOnly>
 *   <AdminPanel />
 * </OwnerOnly>
 */
export function OwnerOnly({ children, fallback }: OwnerOnlyProps) {
  return (
    <RequireRole allow={['owner']} fallback={fallback}>
      {children}
    </RequireRole>
  );
}

export default OwnerOnly;
