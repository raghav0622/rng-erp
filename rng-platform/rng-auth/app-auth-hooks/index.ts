'use client';

/**
 * rng-auth-hooks: Frozen v1 React Query hooks layer for app-auth-service.
 *
 * This layer provides 100% functional coverage of app-auth-service via hooks.
 * Hooks are pure wrappers with 1:1 semantics—zero additional logic.
 * UI code must never import app-auth-service directly.
 *
 * RULE: All auth access goes through hooks.
 *
 * ## Status
 * 🔒 **Frozen v1** — Locked for production stability (see {@link ./FROZEN_V1.md})
 *
 * ## Critical: Null is NOT an Error
 *
 * @example
 * ```tsx
 * const { data: user } = useCurrentUser();
 * if (user) {
 *   // User is authenticated and exists
 *   return <Dashboard user={user} />;
 * }
 * // user === null means "not authenticated" — this is NORMAL state, not an error
 * return <LoginPrompt />;
 * ```
 *
 * Use Suspense for loading states, error boundaries for exceptions only.
 *
 * ## Documentation
 * - {@link ./README.md} — Overview and core rules
 * - {@link ./AUTH_HOOKS_MODEL.md} — Mental model and concepts
 * - {@link ./RETURN_SEMANTICS.md} — Null vs error handling patterns
 * - {@link ./CACHING_STRATEGY.md} — Cache key hierarchy and invalidation
 * - {@link ./ROLE_ACTIONS.md} — Role-grouped facades
 * - {@link ./CLIENT_SIDE_LIMITATIONS.md} — Architectural constraints
 * - {@link ./FROZEN_V1.md} — Versioning and freeze policy
 */

// Session & Auth State
export { useAuthSession } from './useAuthSession';
export { useGetSessionSnapshot } from './useGetSessionSnapshot';
export { useRequireAuthenticated } from './useRequireAuthenticated';

// User Queries
export {
  useCurrentUser,
  useGetUserByEmail,
  useGetUserById,
  useListOrphanedUsers,
  useListUsers,
  useListUsersPaginated,
  useSearchUsers,
} from './useUserQueries';

// Bootstrap & State Queries
export {
  useGetLastAuthError,
  useGetLastSessionTransitionError,
  useIsOwnerBootstrapped,
  useIsSignupAllowed,
  useIsSignupComplete,
} from './useBootstrapQueries';

// Auth Mutations (sign in/out, password, email)
export {
  useChangePassword,
  useConfirmPassword,
  useConfirmPasswordReset,
  useOwnerSignUp,
  useSendEmailVerification,
  useSendEmailVerification as useSendEmailVerificationEmail,
  useSendPasswordResetEmail,
  useSignIn,
  useSignOut,
  useSignUpWithInvite,
} from './useAuthMutations';

// User Management Mutations
export {
  useCleanupOrphanedUser,
  useDeleteUser,
  useInviteUser,
  useReactivateUser,
  useResendInvite,
  useRestoreUser,
  useRevokeInvite,
  useUpdateOwnerProfile,
  useUpdateUserPhoto,
  useUpdateUserProfile,
  useUpdateUserRole,
  useUpdateUserStatus,
} from './useUserManagementMutations';

// Role-Grouped Facades (re-exports only)
export {
  useAuthActions,
  useClientActions,
  useEmployeeActions,
  useManagerActions,
  useOwnerActions,
} from './useRoleGroupedFacades';

// Zod Schemas & Types
export {
  changePasswordSchema,
  cleanupOrphanedUserSchema,
  confirmPasswordResetSchema,
  confirmPasswordSchema,
  deleteUserSchema,
  inviteUserSchema,
  ownerSignUpSchema,
  reactivateUserSchema,
  resendInviteSchema,
  restoreUserSchema,
  revokeInviteSchema,
  searchUsersSchema,
  sendPasswordResetEmailSchema,
  signInSchema,
  signUpWithInviteSchema,
  updateOwnerProfileSchema,
  updateUserPhotoSchema,
  updateUserProfileSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  type ChangePasswordInput,
  type CleanupOrphanedUserInput,
  type ConfirmPasswordInput,
  type ConfirmPasswordResetInput,
  type DeleteUserInput,
  type InviteUserInput,
  type OwnerSignUpInput,
  type ReactivateUserInput,
  type ResendInviteInput,
  type RestoreUserInput,
  type RevokeInviteInput,
  type SearchUsersInput,
  type SendPasswordResetEmailInput,
  type SignInInput,
  type SignUpWithInviteInput,
  type UpdateOwnerProfileInput,
  type UpdateUserPhotoInput,
  type UpdateUserProfileInput,
  type UpdateUserRoleInput,
  type UpdateUserStatusInput,
} from './schemas';

// Cache Keys (for advanced cache management if needed)
export { authQueryKeys } from './keys';

// Re-export service types (do NOT export service instance)
export type {
  AuthSession,
  AuthSessionState,
  UnsubscribeFn,
} from '../app-auth-service/app-auth.contracts';

export type {
  AppUser,
  AppUserInviteStatus,
  AppUserRole,
  CreateInvitedUser,
  ListUsersPaginatedResult,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from '../app-auth-service/internal-app-user-service/app-user.contracts';

// Error types (for UI error handling)
export {
  AppAuthError,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  InvalidEmailError,
  InvalidInputError,
  InviteAlreadyAcceptedError,
  InviteInvalidError,
  InviteRevokedError,
  NotAuthenticatedError,
  NotAuthorizedError,
  NotOwnerError,
  NotSelfError,
  OwnerAlreadyExistsError,
  OwnerBootstrapRaceDetectedError,
  SessionExpiredError,
  TooManyRequestsError,
  UserDisabledError,
  WeakPasswordError,
  isAppAuthError,
} from '../app-auth-service/app-auth.errors';
