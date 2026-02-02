/**
 * Lazy-loaded screen exports for optimized bundle splitting
 *
 * Benefits:
 * - Reduces initial bundle size
 * - Faster page loads
 * - On-demand code loading
 * - Better performance for large apps
 *
 * Usage:
 * ```tsx
 * import { LazySignInScreen } from '@/rng-platform/rng-auth/app-auth-components/screens/lazy';
 *
 * <Suspense fallback={<AuthLoadingOverlay />}>
 *   <LazySignInScreen />
 * </Suspense>
 * ```
 */

import { lazy } from 'react';

// Auth Screens
export const LazySignInScreen = lazy(() => import('./SignInScreen'));
export const LazySignUpWithInviteScreen = lazy(() => import('./SignUpWithInviteScreen'));
export const LazyOwnerBootstrapScreen = lazy(() => import('./OwnerBootstrapScreen'));
export const LazyForgotPasswordScreen = lazy(() => import('./ForgotPasswordScreen'));
export const LazyResetPasswordScreen = lazy(() => import('./ResetPasswordScreen'));
export const LazyChangePasswordScreen = lazy(() => import('./ChangePasswordScreen'));
export const LazyEmailVerificationScreen = lazy(() => import('./EmailVerificationScreen'));

// User Management Screens
export const LazyUserListScreen = lazy(() => import('./UserListScreen'));
export const LazyUserDirectoryScreen = lazy(() => import('./UserDirectoryScreen'));
export const LazyUserDetailScreen = lazy(() => import('./UserDetailScreen'));
export const LazySearchUsersScreen = lazy(() => import('./SearchUsersScreen'));

// User Actions Screens
export const LazyInviteUserScreen = lazy(() => import('./InviteUserScreen'));
export const LazyUpdateUserRoleScreen = lazy(() => import('./UpdateUserRoleScreen'));
export const LazyUpdateUserStatusScreen = lazy(() => import('./UpdateUserStatusScreen'));
export const LazyUpdateUserProfileScreen = lazy(() => import('./UpdateUserProfileScreen'));
export const LazyEditOwnProfileScreen = lazy(() => import('./EditOwnProfileScreen'));

// User Lifecycle Screens
export const LazyDeleteUserScreen = lazy(() => import('./DeleteUserScreen'));
export const LazyRestoreUserScreen = lazy(() => import('./RestoreUserScreen'));
export const LazyReactivateUserScreen = lazy(() => import('./ReactivateUserScreen'));

// Invite Management Screens
export const LazyResendInviteScreen = lazy(() => import('./ResendInviteScreen'));
export const LazyRevokeInviteScreen = lazy(() => import('./RevokeInviteScreen'));

// Maintenance Screens
export const LazyOrphanedUsersCleanupScreen = lazy(() => import('./OrphanedUsersCleanupScreen'));
