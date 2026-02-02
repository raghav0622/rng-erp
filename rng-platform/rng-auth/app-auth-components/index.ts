/**
 * @module app-auth-components
 *
 * Production-grade authentication UI components for rng-erp.
 * Pure UI composition layer over frozen app-auth-service and app-auth-hooks.
 *
 * **Design Principles:**
 * - Zero business logic (delegates to hooks/service)
 * - No direct service imports (hooks only)
 * - Typed errors (AppAuthError)
 * - Mantine UI (consistent styling)
 * - rng-forms (schema-driven forms)
 *
 * **Architecture:**
 * - Shell: AuthAppShell (state-based routing)
 * - Guards: RequireAuthenticated, RequireRole
 * - Screens: Full-page auth flows
 * - Boundaries: Error/loading/empty states
 *
 * **Security Notes:**
 * - Client-side enforcement only
 * - Service remains authoritative
 * - Non-atomic flows (see CLIENT_SIDE_LIMITATIONS.md)
 * - Session disablement doesn't kill active sessions
 *
 * @see README.md for integration guide
 * @see AUTH_UI_MODEL.md for mental model
 */

// Core shell
export { AuthAppShell } from './shell';
export type { AuthAppShellProps } from './shell';

// Guards
export {
  AllowIfSelf,
  CanManageRole,
  CanPerform,
  ManagerOrAbove,
  OwnerOnly,
  RequireAuthenticated,
  RequireRole,
} from './guards';
export type {
  AllowIfSelfProps,
  AuthAction,
  CanManageRoleProps,
  CanPerformProps,
  ManagerOrAboveProps,
  OwnerOnlyProps,
  RequireAuthenticatedProps,
  RequireRoleProps,
} from './guards';

// Screens
export {
  ChangePasswordScreen,
  DeleteUserScreen,
  EditOwnProfileScreen,
  EmailVerificationScreen,
  ForgotPasswordScreen,
  InviteUserScreen,
  OrphanedUsersCleanupScreen,
  OwnerBootstrapScreen,
  ReactivateUserScreen,
  ResendInviteScreen,
  ResetPasswordScreen,
  RestoreUserScreen,
  RevokeInviteScreen,
  SearchUsersScreen,
  SignInScreen,
  SignUpWithInviteScreen,
  UpdateUserProfileScreen,
  UpdateUserRoleScreen,
  UpdateUserStatusScreen,
  UserDetailScreen,
  UserDirectoryScreen,
  UserListScreen,
} from './screens';
export type {
  ChangePasswordScreenProps,
  DeleteUserScreenProps,
  EditOwnProfileScreenProps,
  EmailVerificationScreenProps,
  ForgotPasswordScreenProps,
  InviteUserScreenProps,
  OrphanedUsersCleanupScreenProps,
  OwnerBootstrapScreenProps,
  ReactivateUserScreenProps,
  ResendInviteScreenProps,
  ResetPasswordScreenProps,
  RestoreUserScreenProps,
  RevokeInviteScreenProps,
  SearchUsersScreenProps,
  SignInScreenProps,
  SignUpWithInviteScreenProps,
  UpdateUserProfileScreenProps,
  UpdateUserRoleScreenProps,
  UpdateUserStatusScreenProps,
  UserDetailScreenProps,
  UserDirectoryScreenProps,
  UserListScreenProps,
} from './screens';

// Modals
export { PasswordConfirmationModal } from './modals';
export type { PasswordConfirmationModalProps } from './modals';

// Boundaries
export { AuthEmptyState, AuthErrorBoundary, AuthLoadingOverlay } from './boundaries';
export type {
  AuthEmptyStateProps,
  AuthErrorBoundaryProps,
  AuthLoadingOverlayProps,
} from './boundaries';

// Components
export {
  ConfirmationCheckbox,
  EmailVerificationBadge,
  EmailVerificationBanner,
  EmptyState,
  EmptyStateWithAction,
  ExternalErrorsDisplay,
  FormSkeleton,
  InviteStatusBadge,
  NoDeletedUsersEmptyState,
  NoInvitesEmptyState,
  NoOrphanedUsersEmptyState,
  NoUsersEmptyState,
  OrphanedUserBadge,
  PasswordStrengthMeter,
  RoleBadge,
  RolePermissionComparison,
  UserActionsMenu,
  UserAuditTimeline,
  UserAvatar,
  UserCard,
  UserCardSkeleton,
  UserDetailSkeleton,
  UserInfoTable,
  UserListItem,
  UserListSkeleton,
  UserProfileCard,
  UserSearchInput,
  UserStatusBadge,
} from './components';

// HOCs
export {
  withAuthAppShell,
  withConfirmPassword,
  withManagerOrAbove,
  withOwnerOnly,
  withRoleGuard,
} from './hoc';

// Hooks
export { useMutationErrorHandler, useUserActionHandlers } from './hooks';

// Utilities
export * from './utils';
