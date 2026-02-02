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
  SignUpWithInviteInput,
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

/**
 * Mutation hook: sign up with invite.
 * Session-lifecycle mutation: invalidates ALL auth caches on success (authenticated state change).
 *
 * Flow:
 * 1. Verify email exists as invited AppUser (inviteStatus='invited')
 * 2. Create Firebase Auth user with email/password
 * 3. Link authUid to existing AppUser document
 * 4. Update inviteStatus to 'activated'
 * 5. Set isRegisteredOnERP to true
 * 6. Handle rollback if linking fails
 *
 * Design:
 * - No invite tokens/codes—uses Firestore AppUser document as source of truth
 * - One-time authUid linking (immutable)
 * - Rollback protection for race conditions
 * - Disabled users cannot sign up
 *
 * @example
 * const signUpWithInvite = useSignUpWithInvite();
 * await signUpWithInvite.mutateAsync({
 *   email: 'user@example.com',
 *   password: 'SecurePass123!',
 *   confirmPassword: 'SecurePass123!'
 * });
 */
export function useSignUpWithInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignUpWithInviteInput) => {
      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        return Promise.reject(new Error("Passwords don't match"));
      }

      // Call service layer to handle:
      // 1. Lookup AppUser by email
      // 2. Verify inviteStatus === 'invited'
      // 3. Create Firebase Auth user
      // 4. Link authUid to AppUser
      // 5. Update AppUser (inviteStatus='activated', isRegisteredOnERP=true)
      // Implementation calls service method that handles all invariants and rollback
      return appAuthService.signupWithInvite(data.email, data.password);
    },
    onSuccess: () => {
      // Session-lifecycle mutation: invalidate ALL auth caches
      queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
    },
  });
}
