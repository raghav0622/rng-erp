'use client';

import type { ReactNode } from 'react';
import { RequireRole } from './RequireRole';

export interface ManagerOrAboveProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ManagerOrAbove guard - Restrict component access to manager or owner role
 *
 * Features:
 * - Restricts access to users with role === 'manager' or 'owner'
 * - Requires RequireAuthenticated parent (enforced via RequireRole)
 * - Shows fallback UI if user doesn't have sufficient role
 *
 * Authorization Hierarchy:
 * 1. RequireAuthenticated (account state check) - enforced by RequireRole
 * 2. RequireRole check (role in ['owner', 'manager']) - this guard
 * 3. Feature access
 *
 * Role Hierarchy:
 * - owner: Full system access (highest)
 * - manager: Team management access
 * - employee: Limited team member access
 * - client: External party access (lowest)
 *
 * @example
 * <ManagerOrAbove>
 *   <TeamManagementPanel />
 * </ManagerOrAbove>
 */
export function ManagerOrAbove({ children, fallback }: ManagerOrAboveProps) {
  return (
    <RequireRole allow={['owner', 'manager']} fallback={fallback}>
      {children}
    </RequireRole>
  );
}

export default ManagerOrAbove;
