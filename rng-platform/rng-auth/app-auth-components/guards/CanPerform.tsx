'use client';

import type { ReactNode } from 'react';
import { useRequireAuthenticated } from '../../app-auth-hooks/index';
import type {
  AppUser,
  AppUserRole,
} from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthEmptyState } from '../boundaries/AuthEmptyState';

export type AuthAction =
  | 'invite_user'
  | 'delete_user'
  | 'update_user_role'
  | 'update_user_status'
  | 'restore_user'
  | 'manage_invites'
  | 'view_orphaned'
  | 'edit_user_profile';

/**
 * Action-based authorization matrix
 * Defines which roles can perform which actions
 */
const actionMatrix: Record<AppUser['role'], AuthAction[]> = {
  owner: [
    'invite_user',
    'delete_user',
    'update_user_role',
    'update_user_status',
    'restore_user',
    'manage_invites',
    'view_orphaned',
    'edit_user_profile',
  ],
  manager: [
    'invite_user',
    'delete_user',
    'update_user_role',
    'update_user_status',
    'restore_user',
    'manage_invites',
    'edit_user_profile',
  ],
  employee: ['edit_user_profile'],
  client: ['edit_user_profile'],
};

export interface CanPerformProps {
  /**
   * Action to authorize
   */
  action: AuthAction;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * CanPerform guard - Action-based authorization
 *
 * Features:
 * - Checks if current user can perform a specific action
 * - Requires RequireAuthenticated parent
 * - Uses role-based permission matrix
 * - Shows fallback UI if action not permitted
 *
 * Authorization Matrix:
 * - owner: All actions
 * - manager: Invite, delete, update role/status, restore, manage invites, edit profiles
 * - employee: Edit own profile only
 * - client: Edit own profile only
 *
 * Authorization Hierarchy:
 * 1. RequireAuthenticated (account state check) - enforced by this guard
 * 2. Action permission check (actionMatrix[role]) - this guard
 * 3. Feature access (may require additional resource ownership checks)
 *
 * @example
 * <CanPerform action="invite_user">
 *   <InviteUserButton />
 * </CanPerform>
 *
 * @example
 * <CanPerform action="delete_user" fallback={<span>Cannot delete users</span>}>
 *   <DeleteUserButton />
 * </CanPerform>
 */
export function CanPerform({ action, children, fallback }: CanPerformProps) {
  const currentUser = useRequireAuthenticated();

  // Check if user's role can perform this action
  const canPerform = actionMatrix[currentUser.role as AppUserRole]?.includes(action) || false;

  if (!canPerform) {
    return (
      fallback || (
        <AuthEmptyState
          title="Access Denied"
          description={`You don't have permission to ${action.replace(/_/g, ' ')}`}
        />
      )
    );
  }

  return <>{children}</>;
}

export default CanPerform;
