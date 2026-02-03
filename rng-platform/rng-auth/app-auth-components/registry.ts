/**
 * @module registry
 *
 * Modular registry for app-auth-components
 * Provides organized, category-based exports for easier navigation and tree-shaking
 *
 * Usage:
 * ```typescript
 * import { screens, modals, hooks, hoc, components, guards, boundaries } from './registry';
 *
 * // Import specific category
 * const { SignInScreen, ForgotPasswordScreen } = screens;
 *
 * // Or import individual exports
 * import { SignInScreen } from './screens';
 * ```
 */

// ============================================================================
// SCREENS - Full-page auth flows and user management screens
// ============================================================================
export * as screens from './screens';

// ============================================================================
// MODALS - Dialog components for authentication flows
// ============================================================================
export * as modals from './modals';

// ============================================================================
// HOOKS - Custom hooks for auth logic and state management
// ============================================================================
export * as hooks from './hooks';

// ============================================================================
// HOC (Higher-Order Components) - Composition patterns for auth features
// ============================================================================
export * as hoc from './hoc';

// ============================================================================
// COMPONENTS - Reusable UI components
// ============================================================================
export * as components from './components';

// ============================================================================
// BOUNDARIES - Error boundaries, loading states, and empty states
// ============================================================================
export * as boundaries from './boundaries';

// ============================================================================
// GUARDS - Route and render guards for authorization
// ============================================================================
export * as guards from './guards';

// ============================================================================
// SHELL - Core authentication application shell
// ============================================================================
export { AuthAppShell } from './shell';
export type { AuthAppShellProps } from './shell';

// ============================================================================
// CONVENIENCE EXPORTS - Most commonly used items at top level
// ============================================================================

// Core shell
export { AuthAppShell as AppAuthShell } from './shell';

// Most common guards
export {
  AllowIfSelf,
  CanPerform,
  ManagerOrAbove,
  OwnerOnly,
  RequireAuthenticated,
  RequireRole,
} from './guards';

// Most common screens
export {
  ChangePasswordScreen,
  EditOwnProfileScreen,
  EmailVerificationScreen,
  ForgotPasswordScreen,
  OwnerBootstrapScreen,
  ResetPasswordScreen,
  SignInScreen,
  SignUpWithInviteScreen,
} from './screens';

// Most common HOCs
export {
  withAuthAppShell,
  withConfirmPassword,
  withManagerOrAbove,
  withOwnerOnly,
  withRoleGuard,
} from './hoc';

// Most common components
export {
  EmailVerificationBanner,
  PasswordStrengthMeter,
  RoleBadge,
  UserActionsMenu,
  UserAvatar,
  UserCard,
  UserProfileCard,
} from './components';

// Error boundaries and state displays
export { AuthEmptyState, AuthErrorBoundary, AuthLoadingOverlay } from './boundaries';
