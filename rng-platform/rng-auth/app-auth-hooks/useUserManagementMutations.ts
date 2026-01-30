'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appAuthService } from './internal/authService';
import { authQueryKeys } from './keys';
import type {
  CleanupOrphanedUserInput,
  DeleteUserInput,
  InviteUserInput,
  ReactivateUserInput,
  ResendInviteInput,
  RestoreUserInput,
  RevokeInviteInput,
  UpdateOwnerProfileInput,
  UpdateUserPhotoInput,
  UpdateUserProfileInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
} from './schemas';

/**
 * Mutation hook: update owner profile.
 * Invalidates current user and all user queries.
 */
export function useUpdateOwnerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateOwnerProfileInput) => appAuthService.updateOwnerProfile(data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser() });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.userDetail(user.id) });
    },
  });
}

/**
 * Mutation hook: update user profile (name, photoUrl).
 * Invalidates specific user detail and user list.
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserProfileInput) =>
      appAuthService.updateUserProfile(input.userId, input.data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.userDetail(user.id) });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}

/**
 * Mutation hook: update user photo.
 * Accepts File or base64 string; passes directly to service.
 * Invalidates specific user detail and user list.
 *
 * @param input.userId - Target user ID
 * @param input.photo - File object or base64 string (data:image/jpeg;base64,...) or undefined to clear
 *   - File: Browser File object (processed by service)
 *   - String: Base64-encoded image data with MIME prefix
 *   - Undefined: Clears photo
 */
export function useUpdateUserPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserPhotoInput) =>
      appAuthService.updateUserPhoto(input.userId, input.photo),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.userDetail(user.id) });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}

/**
 * Mutation hook: update user role.
 * Invalidates specific user detail and all user queries.
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserRoleInput) =>
      appAuthService.updateUserRole(input.userId, input.data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.userDetail(user.id) });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}

/**
 * Mutation hook: update user status (enable/disable).
 * Invalidates specific user detail and all user queries.
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateUserStatusInput) =>
      appAuthService.updateUserStatus(input.userId, input.data),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.userDetail(user.id) });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}

/**
 * Mutation hook: invite user.
 * Invalidates all user queries on success.
 */
export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InviteUserInput) => appAuthService.inviteUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}

/**
 * Mutation hook: resend invite.
 * Invalidates specific user detail and user list.
 */
export function useResendInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ResendInviteInput) =>
      appAuthService.resendInvite(input.userId, input.options),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.userDetail(user.id) });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}

/**
 * Mutation hook: revoke invite.
 * Invalidates specific user detail and user list.
 */
export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RevokeInviteInput) => appAuthService.revokeInvite(input.userId),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.userDetail(user.id) });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}

/**
 * Mutation hook: delete user.
 * Invalidates user list and current user.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteUserInput) => appAuthService.deleteUser(input.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser() });
    },
  });
}

/**
 * Mutation hook: restore user.
 * Invalidates user list.
 */
export function useRestoreUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RestoreUserInput) => appAuthService.restoreUser(input.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}

/**
 * Mutation hook: reactivate user.
 * Invalidates user list.
 */
export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReactivateUserInput) => appAuthService.reactivateUser(input.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}

/**
 * Mutation hook: cleanup orphaned linked user (maintenance API).
 * Invalidates orphaned users list.
 */
export function useCleanupOrphanedUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CleanupOrphanedUserInput) =>
      appAuthService.cleanupOrphanedLinkedUser(input.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.orphanedUsers() });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    },
  });
}
