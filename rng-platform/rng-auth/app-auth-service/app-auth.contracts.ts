import type {
  AppUser,
  CreateInvitedUser,
  ListUsersPaginatedResult,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './internal-app-user-service/app-user.contracts';
export type { ListUsersPaginatedResult } from './internal-app-user-service/app-user.contracts';
/**
 * Authenticated ERP session.
 *
 * Note:
 * - token is derived from Firebase Auth
 * - AppUser is the ERP user projection (see RBAC for permissions)
 */

/**
 * High-level authentication session state.
 *
 * Designed for Suspense-friendly consumption.
 * Exactly one state is active at any time.
 *
 * Note:
 */
export type AuthSessionState =
  | 'unknown' // App booting, Firebase not resolved yet
  | 'unauthenticated' // No Firebase user
  | 'authenticating' // Sign-in / sign-up in progress
  | 'authenticated'; // Firebase + AppUser resolved

/**
 * AuthSession is the canonical client-side auth state.
 * See SESSION_MODEL.md and AUTH_MODEL.md.
 */
export interface AuthSession {
  state: AuthSessionState;
  user: AppUser | null;
  emailVerified: boolean | null;
  lastTransitionError: { error: unknown; from: AuthSessionState; to: AuthSessionState } | null;
  lastAuthError: { error: unknown; timestamp: Date } | null;
}

export type UnsubscribeFn = () => void;

/**
 * AppAuthService contract. See README.public.md, README.internal.md, CLIENT_SIDE_LIMITATIONS.md.
 */

export interface IAppAuthService {
  /**
   * Restore a soft-deleted user (restore = deleted user).
   * @param userId User ID
   * @returns The restored user
   */
  restoreUser(userId: string): Promise<AppUser>;

  /**
   * User search (client-side policy). See CLIENT_SIDE_LIMITATIONS.md.
   */
  searchUsers(query: Partial<AppUser>): Promise<AppUser[]>;

  /**
   * Reactivate a previously disabled user (reactivate = disabled user).
   * @param userId User ID
   * @returns The reactivated user
   */
  reactivateUser(userId: string): Promise<AppUser>;
  /**
   * Owner bootstrap (client-side, non-atomic). See CLIENT_SIDE_LIMITATIONS.md.
   */
  ownerSignUp(data: {
    email: string;
    password: string;
    name: string;
    photoUrl?: string;
  }): Promise<AuthSession>;

  /**
   * Sign in with email/password. See AUTH_MODEL.md.
   */
  signIn(email: string, password: string): Promise<AuthSession>;

  /**
   * Sign out the current user.
   */
  signOut(): Promise<void>;

  /**
   * Send password reset email. See CLIENT_SIDE_LIMITATIONS.md.
   */
  sendPasswordResetEmail(email: string): Promise<void>;

  /**
   * Send email verification link. See AUTH_MODEL.md.
   */
  sendEmailVerificationEmail(): Promise<void>;

  /**
   * Complete password reset. See README.public.md.
   */
  confirmPasswordReset(code: string, newPassword: string): Promise<void>;

  /**
   * Change password for the currently authenticated user.
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Return the current user after auth resolution. See SESSION_MODEL.md.
   */
  getCurrentUser(): Promise<AppUser | null>;

  /**
   * Owner-only profile update. See README.public.md.
   */
  updateOwnerProfile(data: { name?: string; photoUrl?: string }): Promise<AppUser>;

  /**
   * Invite creation (owner-only). See INVITE_FLOW.md.
   */
  inviteUser(data: CreateInvitedUser): Promise<AppUser>;

  /**
   * Invite activation (post-signup). See INVITE_FLOW.md.
   */
  acceptInvite(): Promise<AuthSession>;

  /**
   * Subscribe to auth state changes. See SESSION_MODEL.md.
   */
  onAuthStateChanged(callback: (session: AuthSession) => void): UnsubscribeFn;

  /**
   * Synchronous session snapshot. See SESSION_MODEL.md.
   */
  getSessionSnapshot(): AuthSession;

  /**
   * Returns the last auth state change error (if any).
   * Issue #13 fix: Expose for UI error display.
   * Can be used to show user-friendly error messages when auth fails.
   * @internal (monitoring/debugging, optional UI display)
   */
  getLastAuthError(): { error: unknown; timestamp: Date } | null;

  /**
   * Returns the last session state machine transition error (if any).
   * Issue #12 fix: Expose for dev tools/debugging.
   * @internal (dev tools/debugging only, do not depend on this in UI code)
   */
  getLastSessionTransitionError(): {
    error: unknown;
    timestamp: Date;
    from: AuthSessionState;
    to: AuthSessionState;
  } | null;

  // ---------------------------------------------------------------------------
  // USER MANAGEMENT (delegated to AppUserService internally)
  // ---------------------------------------------------------------------------

  /**
   * NOTE:
   * These methods are exposed ONLY via AppAuthService.
   * AppUserService is an internal dependency and MUST NOT
   * be used directly by application code.
   */

  /**
   * Update a user's profile fields.
   *
   * Rules:
   * - Owner: MUST use updateOwnerProfile
   * - Manager/Employee: can update self only
   * - Client: forbidden
   */
  updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser>;

  /**
   * Update a user's role or role category.
   *
   * Rules:
   * - Owner only
   * - Owner role is immutable
   */
  updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser>;

  /**
   * Enable or disable a user account.
   *
   * Rules:
   * - Owner only
   * - Owner cannot be disabled
   */
  updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser>;

  /**
   * Delete a user (soft delete).
   *
   * Rules:
   * - Owner only
   * - Owner cannot be deleted
   */
  deleteUser(userId: string): Promise<void>;

  /**
   * Get a user by ID.
   *
   * Returns null if not found.
   */
  getUserById(userId: string): Promise<AppUser | null>;

  /**
   * Get a user by email.
   *
   * Returns null if not found.
   * @dangerous High-risk: exposes user directory. Intended for internal admin UI only.
   */
  getUserByEmail(email: string): Promise<AppUser | null>;

  /**
   * List all users.
   *
   * ⚠️ SOFT-DEPRECATED (Issue #3): Unpaginated query will eventually hit Firestore limits.
   * Suitable only for small deployments (< 1000 users).
   * RECOMMENDED: Use listUsersPaginated() instead for new code.
   *
   * Audit visibility: Any authenticated user (including clients) can see all users, including internal users.
   * This is intentional and must be treated as audited data, not casual UI data. Clients can infer organization structure.
   *
   * Rules:
   * - Any authenticated user
   */
  listUsers(): Promise<AppUser[]>;

  /**
   * Internal-only repair: list orphaned linked users created by failed invite activation.
   * Criteria: inviteStatus = 'activated' AND isRegisteredOnERP = false
   * Owner only.
   * @internal (maintenance operation; do not depend on this in UI code)
   */
  listOrphanedLinkedUsers(): Promise<AppUser[]>;

  /**
   * Internal-only repair: remove orphaned linked user.
   * Owner only.
   * @internal (maintenance operation; do not depend on this in UI code)
   */
  cleanupOrphanedLinkedUser(userId: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // SYSTEM STATE
  // ---------------------------------------------------------------------------

  /**
   * Returns true if the owner account has been bootstrapped.
   */
  isOwnerBootstrapped(): Promise<boolean>;

  /**
   * Returns true if signup is currently allowed.
   *
   * Signup is allowed only before owner bootstrap.
   */
  isSignupAllowed(): Promise<boolean>;

  /**
   * Check if current authenticated user has completed registration.
   * Issue #7 fix: DX improvement for UI to determine onboarding state.
   *
   * BEHAVIOR:
   * - Returns true if user is authenticated AND isRegisteredOnERP === true AND inviteStatus === 'activated'
   * - Returns false if not authenticated or registration incomplete
   * - Safe to call anytime; never throws
   *
   * USE CASE:
   * - Show "complete profile" prompts if registration incomplete
   * - Gate app features behind registration complete check
   * - Display "pending activation" UI state
   *
   * @returns true if authenticated user has completed ERP registration
   */
  isRegistrationComplete(): boolean;

  /**
   * Re-authenticate the currently authenticated user by confirming their password.
   *
   * Scope:
   * - Applies only to the active session user
   * - Cannot be used to confirm password for other users
   * - Required before sensitive operations.
   *
   * SEMANTICS:
   * confirmPassword does not mutate state; it only re-authenticates the active session.
   */
  confirmPassword(password: string): Promise<void>;
  /**
   * List users with pagination.
   *
   * @param pageSize Number of users to return per page
   * @param pageToken Optional token for pagination
   * @returns Paginated result of users and next page token
   */
  listUsersPaginated(pageSize: number, pageToken?: string): Promise<ListUsersPaginatedResult>;

  /**
   * Public but intended for internal use by the service and hooks.
   * Throws if there is no authenticated user.
   */
  requireAuthenticated(): AppUser;
  /* AppUser is always a projection of the corresponding Firebase Auth user.
 * Email is mirrored from Auth and is NOT updatable via AppUserService.
  /**
   * Resend an invite to a user (if inviteStatus is 'invited').
   * Owner only.
   */
  resendInvite(userId: string): Promise<AppUser>;

  /**
   * Revoke an invite (if inviteStatus is 'invited').
   * Owner only.
   */
  revokeInvite(userId: string): Promise<AppUser>;
}

/**
 * AUTH SESSION STATE TRANSITIONS
 *
 * unknown → unauthenticated
 * unknown → authenticated
 *
 * unauthenticated → authenticating
 * authenticating → authenticated
 *
 * authenticated → unauthenticated
 *
 */

/**
 * IMPORTANT DISTINCTION:
 *
 * - Firebase Auth user MAY exist without AppUser (invalid state)
 * - AppAuthService guarantees:
 *     authenticated ⇒ AppUser exists
 *
 * If Auth user exists but AppUser does not,
 * service MUST sign out and surface error.
 */
