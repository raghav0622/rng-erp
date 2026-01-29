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
 * AuthSession represents the current authentication state and user projection.
 * Only the fields defined here are intentionally exposed to consumers.
 *
 * - state: High-level session state (see AuthSessionState)
 * - user: The current AppUser projection, or null if unauthenticated
 * - emailVerified: Explicit signal from Firebase Auth (source of truth).
 *   - null when state === 'unauthenticated' or 'unknown'
 *   - true/false when state === 'authenticated' (from Firebase Auth)
 *   UI can use this to block actions requiring email verification without inferring from invariants.
 *
 * IMPORTANT: emailVerified is eventually-consistent synced to Firestore (Issue #7).
 * - On initial auth, emailVerified is pulled from Firebase Auth
 * - If Firestore sync fails transiently, AppUser.emailVerified may lag Firebase
 * - Next auth state change retries sync (no explicit reconciliation in v1)
 * - This is acceptable: eventual consistency sufficient for ERP context
 *
 * - lastTransitionError: The most recent session state transition error (for debugging).
 *   - null if the most recent transition was valid
 *   - Error object + metadata if validation failed (not thrown, swallowed by setSession)
 *
 * Issue #12 - lastTransitionError Lifecycle:
 *   - Set when validateSessionTransition() fails (invalid state machine transition)
 *   - Cleared on next successful transition (explicitly set to null)
 *   - NOT persisted across app restarts (ephemeral, in-memory only)
 *   - Intended for UI/devtools inspection, not application logic
 *   - Should be monitored/logged but not used for user-facing error messages
 */
export interface AuthSession {
  state: AuthSessionState;
  user: AppUser | null;
  emailVerified: boolean | null;
  lastTransitionError: { error: unknown; from: AuthSessionState; to: AuthSessionState } | null;
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
   * @dangerous High-risk: exposes org structure. Intended for internal admin UI only.
   * @param query Partial<AppUser> fields to match (must be allow-listed)
   * @returns Array of users matching query
   *
   * Issue #3 & #9: KNOWN LIMITATION - email uniqueness is non-atomic.
   * Multiple concurrent invites with the same email may both succeed due to Firestore eventual consistency.
   * Owner should monitor for duplicate emails and manually clean up via delete/restore.
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
   *
   * SECURITY NOTES:
   * - Firebase enforces rate limiting: 6 requests per hour per IP
   * - This method does NOT distinguish between valid and invalid emails (by design)
   * - Client should implement additional rate limiting and user feedback
   * - Password reset codes expire after 1 hour
   */
  sendPasswordResetEmail(email: string): Promise<void>;

  /**
   * Send email verification link to current authenticated user.
   * Issue #6 fix: Email recovery path for users blocked by emailVerified === false.
   *
   * BEHAVIOR:
   * - Sends verification email via Firebase Auth
   * - User must click link to mark email as verified in Firebase
   * - AppUser.emailVerified syncs on next auth state change
   *
   * SECURITY NOTES:
   * - Firebase enforces rate limiting on verification emails
   * - User must be authenticated before calling this
   * - Link expires after 24 hours (Firebase default)
   *
   * @throws NotAuthenticatedError if no authenticated user
   */
  sendEmailVerificationEmail(): Promise<void>;

  /**
   * Complete password reset using Firebase reset code.
   *
   * SECURITY NOTES:
   * - Code must be valid and not expired (throws InternalAuthError if invalid)
   * - Password must meet Firebase strength requirements
   * - This operation does NOT send confirmation email; caller should notify user separately
   */
  confirmPasswordReset(code: string, newPassword: string): Promise<void>;

  /**
   * Change password for the currently authenticated user.
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Returns the currently authenticated ERP user after auth resolution.
   *
   * - Waits for existing Firebase Auth session to resolve (authenticated or unauthenticated)
   * - Does NOT trigger new auth operations or loading
   * - For immediate synchronous snapshot, use getSessionSnapshot()
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
   * Owner-only: invite a new user (Firestore-only, no Firebase Auth user).
   *
   * Behavior:
   * - Creates AppUser with inviteStatus = 'invited'
   * - Does NOT create Firebase Auth user
   * - Invitee must use signupWithInvite() to complete signup (create Auth user)
   * - Invited users CANNOT sign in until they complete signupWithInvite()
   *
   * Invite Lifecycle:
   * 1. Owner calls inviteUser() → creates Firestore invite record (inviteStatus = 'invited')
   * 2. Invitee calls signupWithInvite(email, password) → creates Firebase Auth user + links to invite
   * 3. signupWithInvite automatically activates invite (inviteStatus = 'activated')
   * 4. User can now sign in via signIn()
   *
   * IMMUTABLE: Once created, only the owner can revoke or resend the invite.
   * The invitee cannot self-reject; deletion is permanent and requires admin action.
   */
  inviteUser(data: CreateInvitedUser): Promise<AppUser>;

  /**
   * Invited user: accept invite and complete onboarding.
   *
   * Behavior:
   * - Transitions inviteStatus to 'activated'
   * - Syncs emailVerified from Firebase Auth
   * - Enforces all canonical post-auth invariants
   * - Returns authenticated session
   *
   * CRITICAL PRECONDITIONS:
   * - User MUST have already completed signupWithInvite() (isRegisteredOnERP === true)
   * - User MUST be authenticated via Firebase Auth
   * - Calling this for signup (isRegisteredOnERP === false) will throw InviteInvalidError
   *
   * SECURITY:
   * - Rejects invites that have been revoked
   * - Rejects invites from disabled users
   * - Idempotent: calling for already-activated user is a no-op (safe)
   * - Rejects disabled users at setSession() (defensive race protection)
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

  /**
   * Returns the last session state machine transition error (if any).
   * Issue #6 fix: Expose for dev tools/debugging.
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
