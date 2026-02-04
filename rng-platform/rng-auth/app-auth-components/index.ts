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
 * - Guards: RequireAuthenticated, RequireRole, OwnerOnly, CanPerform, etc.
 * - Screens: Unimplemented screens only (most screens moved to pages)
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

// Screens (unimplemented only - most screens are now in their respective pages)
export { ChangePasswordScreen, EmailVerificationScreen } from './screens';
export type { ChangePasswordScreenProps, EmailVerificationScreenProps } from './screens';

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
  EmailVerificationBadge,
  PasswordConfirmationModal as PasswordConfirmationModalComponent,
  RoleBadge,
  UserActionsMenu,
  UserAvatar,
  UserCardDesign,
  UserInfoTable,
  UserProfileCard,
  UserSearchInput,
  UserStatusBadge,
} from './components';

// Utilities
export * from './utils';
