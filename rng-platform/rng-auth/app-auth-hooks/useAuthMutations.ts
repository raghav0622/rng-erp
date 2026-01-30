'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { appAuthService } from './internal/authService';
import { authQueryKeys } from './keys';
import type {
  ChangePasswordInput,
  ConfirmPasswordInput,
  ConfirmPasswordResetInput,
  OwnerSignUpInput,
  SendPasswordResetEmailInput,
  SignInInput,
} from './schemas';

/**
 * Mutation hook: owner signup.
 * Session-lifecycle mutation: invalidates ALL auth caches on success (authenticated state change).
 */
export function useOwnerSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OwnerSignUpInput) => appAuthService.ownerSignUp(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
    },
  });
}

/**
 * Mutation hook: sign in.
 * Session-lifecycle mutation: invalidates ALL auth caches on success (authenticated state change).
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignInInput) => appAuthService.signIn(data.email, data.password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
    },
  });
}

/**
 * Mutation hook: sign out.
 * Session-lifecycle mutation: invalidates ALL auth caches on success (authenticated state change).
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => appAuthService.signOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
    },
  });
}

/**
 * Mutation hook: send password reset email.
 * No cache invalidation on success (read-only side effect).
 * Invalidates last error on failure.
 */
export function useSendPasswordResetEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendPasswordResetEmailInput) =>
      appAuthService.sendPasswordResetEmail(data.email),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.lastAuthError() });
    },
  });
}

/**
 * Mutation hook: confirm password reset.
 * Invalidates session on success and error.
 */
export function useConfirmPasswordReset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConfirmPasswordResetInput) =>
      appAuthService.confirmPasswordReset(data.code, data.newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.session() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.lastAuthError() });
    },
  });
}

/**
 * Mutation hook: change password.
 * Invalidates session on success and error (clears old cached session).
 */
export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      appAuthService.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.session() });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.lastAuthError() });
    },
  });
}

/**
 * Mutation hook: confirm current password.
 * Verification-only mutation.
 * Invalidates error state on failure for proper error display.
 * No success invalidation (verification doesn't change state).
 */
export function useConfirmPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConfirmPasswordInput) => appAuthService.confirmPassword(data.password),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.lastAuthError() });
    },
  });
}

/**
 * Mutation hook: send email verification.
 * No cache invalidation on success (read-only side effect).
 * Invalidates last error on failure.
 */
export function useSendEmailVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => appAuthService.sendEmailVerificationEmail(),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.lastAuthError() });
    },
  });
}
