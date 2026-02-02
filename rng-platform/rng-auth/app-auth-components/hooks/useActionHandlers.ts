'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AppAuthError } from '../../app-auth-service/app-auth.errors';

/**
 * Hook: Pre-built handlers for UserActionsMenu
 * Eliminates boilerplate for navigation patterns
 *
 * @example
 * const handlers = useUserActionHandlers(userId, '/users');
 * <UserActionsMenu user={user} currentUser={currentUser} {...handlers} />
 */
export function useUserActionHandlers(
  userId: string,
  basePath: string = '/users',
  editPathPrefix: string = '/users/edit',
) {
  const router = useRouter();

  return {
    onEditProfile: () => router.push(`${editPathPrefix}/${userId}`),
    onChangeRole: () => router.push(`${basePath}/${userId}/role`),
    onToggleStatus: () => router.push(`${basePath}/${userId}/status`),
    onDelete: () => router.push(`${basePath}/${userId}/delete`),
    onResendInvite: () => router.push(`${basePath}/${userId}/resend-invite`),
    onRevokeInvite: () => router.push(`${basePath}/${userId}/revoke-invite`),
    onRestore: () => router.push(`${basePath}/${userId}/restore`),
  };
}

/**
 * Hook: Unified error handling for mutations
 * Eliminates repetitive try-catch boilerplate
 *
 * @example
 * const { externalErrors, setExternalErrors, handleError } = useMutationErrorHandler();
 *
 * try {
 *   await mutation.mutateAsync(data);
 * } catch (error) {
 *   handleError(error);
 * }
 */
export function useMutationErrorHandler() {
  const [externalErrors, setExternalErrors] = useState<string[]>([]);

  const handleError = (error: unknown, customMessage?: string) => {
    const appError = error as AppAuthError;
    const message = customMessage || appError.message || 'An error occurred';
    setExternalErrors([message]);
  };

  const clearErrors = () => setExternalErrors([]);

  return {
    externalErrors,
    setExternalErrors,
    handleError,
    clearErrors,
  };
}
