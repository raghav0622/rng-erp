'use client';

import { useRequireAuthenticated } from '@/rng-platform';
import type { ReactNode } from 'react';

export interface RequireAuthenticatedProps {
  /**
   * Content to render when authenticated
   */
  children: ReactNode;
  /**
   * Optional fallback (if not provided, throws NotAuthenticatedError)
   */
  fallback?: ReactNode;
}

/**
 * Guard that requires user to be authenticated.
 * Throws NotAuthenticatedError if not authenticated (caught by AuthErrorBoundary).
 *
 * Design: This is a UI-only guard. The service layer remains authoritative.
 * Guards are for UI routing only, not authorization enforcement.
 *
 * @example
 * <RequireAuthenticated>
 *   <ProtectedDashboard />
 * </RequireAuthenticated>
 *
 * @example With fallback
 * <RequireAuthenticated fallback={<SignInScreen />}>
 *   <ProtectedDashboard />
 * </RequireAuthenticated>
 */
export function RequireAuthenticated({ children, fallback }: RequireAuthenticatedProps) {
  try {
    // Throws NotAuthenticatedError if not authenticated
    const user = useRequireAuthenticated();

    // User is authenticated, render children
    return <>{children}</>;
  } catch (error) {
    // If fallback provided, render it
    if (fallback) {
      return <>{fallback}</>;
    }
    // Otherwise, re-throw to be caught by AuthErrorBoundary
    throw error;
  }
}
