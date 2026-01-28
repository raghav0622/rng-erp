import type { ListUsersPaginatedResult } from '../app-user/app-user.contracts';
export type { ListUsersPaginatedResult } from '../app-user/app-user.contracts';
/**
 * INTERNAL PUBLIC CONTRACT (Extensible)
 *
 * AppAuthService — ERP authentication & user orchestration (email/password only)
 *
 * RESPONSIBILITIES
 * ----------------
 * - Firebase Auth (email/password only)
 * - Session management (client-side)
 * - Owner bootstrap (first and only signup)
 * - Invited-user onboarding
 * - Delegation to AppUserService for all user data mutations
 *
 * NON-RESPONSIBILITIES
 * --------------------
 * - RBAC enforcement (handled in AppAuthService)
 * - Permissions or policy decisions
 * - Trusted devices / sessions
 * - External auth providers
 *
 * CORE RULES
 * ----------
 * - Only ONE public signup is allowed (owner bootstrap)
 * - All other users are invited by the owner
 * - Invited users are created with a SYSTEM-DEFINED initial password
 * - Initial password is NOT secret and MUST be changed by the user
 * - AppUser module is INTERNAL and must not be used directly by apps
 *
 * FIRESTORE-ONLY INVITE MODEL
 * ----------------------
 * - All contracts now reflect Firestore-only invite model.
 *
 * This contract is extensible. Breaking changes require v2.
 * Extension points: add new user fields, search/filter methods, or invariants as needed.
 */

import {
  AppUser,
  CreateAppUser,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from '../app-user/app-user.contracts';
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
 * AuthSession represents the current authentication state and user projection.
 * Only the fields defined here are intentionally exposed to consumers.
 *
 * - state: High-level session state (see AuthSessionState)
 * - user: The current AppUser projection, or null if unauthenticated
 */
export interface AuthSession {
  state: AuthSessionState;
  user: AppUser | null;
}

export type UnsubscribeFn = () => void;

/**
 * AppAuthService
 *
 * This is the ONLY service exposed to application developers
 * for authentication and user management.
 *
 * AppUserService is internal and MUST NOT be consumed directly.
 *
 * ---
 *
 * USAGE EXAMPLES:
 *
 * // Sign in
 * await appAuthService.signIn('user@example.com', 'password');
 *
 * // Owner signup
 * await appAuthService.ownerSignUp({ email, password, name });
 *
 * // Invite a user (owner only)
 * await appAuthService.inviteUser({ email, name, role: 'employee' });
 *
 * // Accept invite
 * await appAuthService.acceptInvite();
 *
 * // Update user profile
 * await appAuthService.updateUserProfile(userId, { name: 'New Name' });
 *
 * // List users (with pagination)
 * const { data, nextPageToken } = await appAuthService.listUsers({ pageSize: 20 });
 *
 * // Resend invite (owner only)
 * await appAuthService.resendInvite(userId);
 *
 * // Revoke invite (owner only)
 * await appAuthService.revokeInvite(userId);
 *
 */

export interface IAppAuthService {
  /**
   * Restore a soft-deleted user (restore = deleted user).
   * @param userId User ID
   * @returns The restored user
   */
  restoreUser(userId: string): Promise<AppUser>;

  /**
   * Search users by indexed, allow-listed fields only (email, role, inviteStatus, isDisabled, isRegisteredOnERP).
   * Only allow-listed, indexed fields are honored. Other fields are ignored.
   * @param query Partial<AppUser> fields to match (must be allow-listed)
   * @returns Array of users matching query
   */
  searchUsers(query: Partial<AppUser>): Promise<AppUser[]>;

  /**
   * Reactivate a previously disabled user (reactivate = disabled user).
   * @param userId User ID
   * @returns The reactivated user
   */
  reactivateUser(userId: string): Promise<AppUser>;
  /**
   * Owner bootstrap (first and only signup).
   *
   * Rules:
   * - Allowed only if no owner exists
   * - Creates Firebase Auth user
   * - Creates AppUser with role = owner
   * - Owner is immediately registered and activated
   *
   * NOTE:
   * - initial password policy does NOT apply to owner bootstrap
   */
  ownerSignUp(data: {
    email: string;
    password: string;
    name: string;
    photoUrl?: string;
  }): Promise<AuthSession>;

  /**
   * Sign in with email and password.
   *
   * Behavior:
   * - Authenticates via Firebase Auth
   * - Resolves AppUser from Firestore
   * - Returns full ERP session
   */
  signIn(email: string, password: string): Promise<AuthSession>;

  /**
   * Sign out the current user.
   */
  signOut(): Promise<void>;

  /**
   * Send password reset email (Firebase-managed).
   */
  sendPasswordResetEmail(email: string): Promise<void>;

  /**
   * Complete password reset using Firebase reset code.
   */
  confirmPasswordReset(code: string, newPassword: string): Promise<void>;

  /**
   * Change password for the currently authenticated user.
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Returns the currently authenticated ERP user.
   *
   * - Convenience async accessor for session.user
   * - For synchronous access, use getSessionSnapshot().
   * - Derived from Firebase Auth session + AppUser
   * - Returns null if not authenticated
   */
  getCurrentUser(): Promise<AppUser | null>;

  /**
   * Owner-only: update own profile.
   *
   * Allowed fields:
   * - name
   * - photoUrl
   */
  updateOwnerProfile(data: { name?: string; photoUrl?: string }): Promise<AppUser>;

  /**
   * Owner-only: invite a new user.
   *
   * Behavior:
   * - Creates Firebase Auth user
   * - Sets password = "rng-associates"
   * - Creates AppUser with inviteStatus = invited
   *
   * NOTE:
   * - initial password is SYSTEM-DEFINED
   * - user must change password on first login
   */
  inviteUser(data: CreateAppUser): Promise<AppUser>;

  /**
   * Invited user: accept invite and complete onboarding.
   *
   * Behavior:
   * - Transitions inviteStatus to 'activated'
   * - Sets isRegisteredOnERP = true
   * - Returns authenticated session
   *
   * Guarantees:
   * - Requires authenticated Firebase session
   * - Fails if user is not in invited state
   *
   * NOTE:
   * - This method is called AFTER first login
   *
   * Preconditions:
   * - Caller MUST already be authenticated via Firebase Auth
   * - Authentication is expected to occur using the initial password.
   *   UX is responsible for enforcing password change after activation.
   */

  acceptInvite(): Promise<AuthSession>;

  /**
   * Subscribe to authentication state changes.
   *
   * Emits:
   * - AuthSession with state = 'authenticated' and user set
   * - AuthSession with state = 'unauthenticated' and user = null
   */
  onAuthStateChanged(callback: (session: AuthSession) => void): UnsubscribeFn;

  /**
   * Returns the last known auth session synchronously.
   *
   * Never throws.
   * Safe to call outside React.
   */
  getSessionSnapshot(): AuthSession;

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
   */
  getUserByEmail(email: string): Promise<AppUser | null>;

  /**
   * List all users.
   *
   * Audit visibility: Any authenticated user (including clients) can see all users, including internal users.
   * This is intentional and must be treated as audited data, not casual UI data. Clients can infer organization structure.
   *
   * Rules:
   * - Any authenticated user
   */
  listUsers(): Promise<AppUser[]>;

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

/**
 * PASSWORD CHANGE INVARIANT:
 *
 * If user.inviteStatus === 'activated' AND
 * user.isRegisteredOnERP === true AND
 * password === initial password,
 *
 * UX MUST block app access until changePassword succeeds.
 */
