'use client';

/**
 * Role-grouped hook facades.
 * These are pure re-exports for discoverability and organization.
 * No logic is added; authorization stays in the service layer.
 */

// Static imports (no require() — breaks ESM and tree-shaking)
import {
  useChangePassword,
  useConfirmPasswordReset,
  useSendEmailVerification,
  useSendPasswordResetEmail,
  useSignIn,
  useSignOut,
} from './useAuthMutations';
import { useAuthSession } from './useAuthSession';
import { useIsOwnerBootstrapped } from './useBootstrapQueries';
import {
  useCleanupOrphanedUser,
  useDeleteUser,
  useInviteUser,
  useReactivateUser,
  useResendInvite,
  useRestoreUser,
  useRevokeInvite,
  useUpdateOwnerProfile,
  useUpdateUserProfile,
  useUpdateUserRole,
  useUpdateUserStatus,
} from './useUserManagementMutations';
import {
  useGetUserByEmail,
  useGetUserById,
  useListOrphanedUsers,
  useListUsers,
  useListUsersPaginated,
  useSearchUsers,
} from './useUserQueries';

// Facades for role-based API organization (re-exports only)

export function useAuthActions() {
  // Core self-actions
  return {
    useAuthSession,
    useSignIn,
    useSignOut,
    useSendPasswordResetEmail,
    useConfirmPasswordReset,
    useChangePassword,
    useSendEmailVerification,
    useUpdateOwnerProfile,
  };
}

export function useOwnerActions() {
  // All owner mutations + queries
  return {
    useListUsers,
    useListUsersPaginated,
    useSearchUsers,
    useGetUserById,
    useGetUserByEmail,
    useInviteUser,
    useResendInvite,
    useRevokeInvite,
    useUpdateUserProfile,
    useUpdateUserRole,
    useUpdateUserStatus,
    useDeleteUser,
    useRestoreUser,
    useReactivateUser,
    useListOrphanedUsers,
    useCleanupOrphanedUser,
    useIsOwnerBootstrapped,
  };
}

export function useManagerActions() {
  // Read-only user queries (no mutations)
  return {
    useListUsers,
    useListUsersPaginated,
    useGetUserById,
    useUpdateUserProfile,
  };
}

export function useEmployeeActions() {
  // Self profile update only
  return {
    useUpdateUserProfile,
    useListUsers,
  };
}

export function useClientActions() {
  // Self profile update only
  return {
    useUpdateUserProfile,
  };
}
