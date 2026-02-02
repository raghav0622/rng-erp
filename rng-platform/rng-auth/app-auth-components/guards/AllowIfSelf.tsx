'use client';

import type { ReactNode } from 'react';
import { useRequireAuthenticated } from '../../app-auth-hooks/index';
import { AuthEmptyState } from '../boundaries/AuthEmptyState';

export interface AllowIfSelfProps {
  /**
   * User ID to check against current user
   */
  userId: string | undefined | null;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * AllowIfSelf guard - Restrict component access to viewing/editing own profile
 *
 * Features:
 * - Restricts access to users viewing/editing their own profile (user.id === userId)
 * - Requires RequireAuthenticated parent
 * - Shows fallback UI if user doesn't own the resource
 * - Useful for profile editing, settings, personal data
 *
 * Authorization Hierarchy:
 * 1. RequireAuthenticated (account state check) - enforced by this guard
 * 2. Resource ownership check (user.id === userId) - this guard
 * 3. Feature access
 *
 * @example
 * <AllowIfSelf userId={params.userId}>
 *   <EditProfileForm />
 * </AllowIfSelf>
 *
 * @example
 * <AllowIfSelf userId={userId} fallback={<AccessDenied />}>
 *   <PrivateSettings />
 * </AllowIfSelf>
 */
export function AllowIfSelf({ userId, children, fallback }: AllowIfSelfProps) {
  const currentUser = useRequireAuthenticated();

  // If no userId provided or it doesn't match current user
  if (!userId || currentUser.id !== userId) {
    return (
      fallback || (
        <AuthEmptyState title="Access Denied" description="You can only view your own profile" />
      )
    );
  }

  return <>{children}</>;
}

export default AllowIfSelf;
