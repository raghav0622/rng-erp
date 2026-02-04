/**
 * @module registry
 *
 * Modular registry for app-auth-components
 * Provides organized, category-based exports for easier navigation and tree-shaking
 *
 * Usage:
 * ```typescript
 * import { screens, modals, components, guards, boundaries } from './registry';
 *
 * // Import specific category
 * const { ChangePasswordScreen } = screens;
 *
 * // Or import individual exports
 * import { ChangePasswordScreen } from './screens';
 * ```
 */

// ============================================================================
// SCREENS - Unimplemented screens only (most screens are now in pages)
// ============================================================================
export * as screens from './screens';

// ============================================================================
// MODALS - Dialog components for authentication flows
// ============================================================================
export * as modals from './modals';

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
// CONVENIENCE EXPORTS - Most commonly used items at top level
// ============================================================================

// Most common guards
export {
  AllowIfSelf,
  CanManageRole,
  CanPerform,
  ManagerOrAbove,
  OwnerOnly,
  RequireAuthenticated,
  RequireRole,
} from './guards';

// Unimplemented screens
export { ChangePasswordScreen, EmailVerificationScreen } from './screens';

// Most common components
export {
  EmailVerificationBadge,
  RoleBadge,
  UserActionsMenu,
  UserAvatar,
  UserCardDesign,
  UserProfileCard,
} from './components';

// Error boundaries and state displays
export { AuthEmptyState, AuthErrorBoundary, AuthLoadingOverlay } from './boundaries';
