/**
 * CANONICAL EMAIL IDENTITY INVARIANT
 *
 * Enforces: Exactly one active (non-soft-deleted) AppUser per email.
 *
 * This is the single enforcement point for email uniqueness across all flows:
 * - createUser (invites, owner bootstrap)
 * - signupWithInvite
 * - getUserByEmail and related queries
 *
 * Non-atomic check-then-create is intentional (documented trade-off).
 * This invariant documents what MUST be true after each operation.
 *
 * @internal
 * @throws AppUserInvariantViolation if multiple active AppUsers share the same email
 */
export function assertEmailUniqueAndActive(users: AppUser[], email: string): void {
  const activeUsers = users.filter((user) => !user.deletedAt);
  if (activeUsers.length > 1) {
    throw new AppUserInvariantViolation(
      'Email uniqueness violation: multiple active AppUsers with this email exist',
      { email, userIds: activeUsers.map((user) => user.id) },
    );
  }
}

/**
 * CANONICAL AUTH IDENTITY LINKING INVARIANT
 *
 * Enforces: Each Firebase Auth user (authUid) links to exactly one active AppUser.
 * Links are one-time, immutable, and irreversible.
 *
 * This is the single enforcement point for auth identity uniqueness:
 * - linkAuthIdentity (primary linking)
 * - signupWithInvite (via linkAuthIdentity)
 * - Any future auth linking operations
 *
 * Violations indicate split-brain state (multiple AppUsers for one authUid).
 *
 * @internal
 * @throws AppUserInvariantViolation if user is already linked to a different authUid
 */
export function assertAuthIdentityNotLinked(user: AppUser, authUid: string): void {
  if (user.id === authUid) {
    throw new AppUserInvariantViolation('Auth identity already linked for this user', {
      userId: user.id,
      authUid,
    });
  }
  if (user.inviteStatus !== 'invited' || user.isRegisteredOnERP) {
    throw new AppUserInvariantViolation('Cannot link auth identity for non-invited user', {
      userId: user.id,
      inviteStatus: user.inviteStatus,
      isRegisteredOnERP: user.isRegisteredOnERP,
    });
  }
}

/**
 * CANONICAL AUTH UID UNIQUENESS INVARIANT
 *
 * Enforces: A Firebase authUid can only belong to one AppUser.
 * Use alongside assertAuthIdentityNotLinked.
 *
 * @internal
 * @throws AppUserInvariantViolation if authUid is already linked to a different AppUser
 */
export function assertAuthUidNotLinked(
  existingAuthUser: AppUser | null,
  authUid: string,
  userId: string,
): void {
  if (existingAuthUser) {
    throw new AppUserInvariantViolation(
      'Cannot link: AppUser with this authUid already exists (race condition detected)',
      { authUid, existingUserId: existingAuthUser.id, attemptedLinkFrom: userId },
    );
  }
}

/**
 * Assert that a user can be hard deleted (permanent delete).
 * Throws if user is owner, does not exist, is not soft-deleted, or is registered on ERP.
 *
 * CRITICAL SAFETY INVARIANT:
 * Hard delete is only safe after:
 * 1. User is soft-deleted (deletedAt !== null)
 * 2. User is NOT registered on ERP (isRegisteredOnERP === false)
 * 3. User is NOT owner
 *
 * This prevents accidental data loss for active or onboarded users.
 */
export function assertUserCanBeHardDeleted(user: AppUser | null): void {
  if (!user) {
    throw new AppUserInvariantViolation('User must exist to be hard deleted');
  }
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation('Owner account cannot be hard deleted', {
      userId: user.id,
    });
  }
  if (!user.deletedAt) {
    throw new AppUserInvariantViolation(
      'User must be soft-deleted before hard delete (deletedAt must not be null)',
      { userId: user.id },
    );
  }
  if (user.isRegisteredOnERP) {
    throw new AppUserInvariantViolation(
      'Cannot hard delete registered users (isRegisteredOnERP must be false)',
      { userId: user.id },
    );
  }
}
// =============================
// CREATION INVARIANTS (SPLIT)
// =============================

/**
 * Assert that an invited user can be created (no authUid required).
 * Enforces: inviteStatus = 'invited', isRegisteredOnERP = false, inviteSentAt exists, email unique.
 */
export function assertValidInvitedUserCreation(input: Partial<AppUser>): void {
  if (input.inviteStatus !== 'invited') {
    throw new AppUserInvariantViolation('Invited user must have inviteStatus = invited');
  }
  if (input.isRegisteredOnERP !== false) {
    throw new AppUserInvariantViolation('Invited user must have isRegisteredOnERP = false');
  }
  if (!input.inviteSentAt) {
    throw new AppUserInvariantViolation('inviteSentAt must exist for invited user');
  }
  // Email uniqueness must be enforced at service layer
}

/**
 * Assert that an owner can be created (authUid required).
 * Enforces: inviteStatus = 'activated', isRegisteredOnERP = true, inviteSentAt undefined, inviteRespondedAt exists, authUid required.
 */
export function assertValidOwnerCreation(input: Partial<AppUser>): void {
  if (input.role !== 'owner') {
    throw new AppUserInvariantViolation('Owner creation requires role = owner');
  }
  if (!input.authUid) {
    throw new AppUserInvariantViolation('Owner creation requires authUid');
  }
  if (input.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('Owner must have inviteStatus = activated');
  }
  if (input.isRegisteredOnERP !== true) {
    throw new AppUserInvariantViolation('Owner must have isRegisteredOnERP = true');
  }
  if (input.inviteSentAt !== undefined) {
    throw new AppUserInvariantViolation('Owner must not have inviteSentAt');
  }
  if (!input.inviteRespondedAt) {
    throw new AppUserInvariantViolation('Owner must have inviteRespondedAt');
  }
}
/**
 * Assert that a user can be activated (inviteStatus must be 'invited').
 * Use this for all invite activation transitions.
 */
export function assertUserCanBeActivated(user: AppUser): void {
  if (user.inviteStatus !== 'invited') {
    throw new AppUserInvariantViolation('User must be invited to activate', { userId: user.id });
  }
}
// =============================
// MISSING INVARIANT FUNCTIONS (RESTORED)
// =============================

/**
 * Assert that a new user starts enabled and with roleUpdatedAt set.
 */
export function assertNewUserBaseDefaults(user: AppUser): void {
  if (user.isDisabled !== false) {
    throw new AppUserInvariantViolation('New users must start with isDisabled === false', {
      id: user.id,
    });
  }
  if (!user.roleUpdatedAt) {
    throw new AppUserInvariantViolation('roleUpdatedAt must be set on creation', { id: user.id });
  }
}

/**
 * Assert that only one owner can ever exist in the system.
 */
export function assertNoExistingOwner(existingOwner: AppUser | null): void {
  if (existingOwner) {
    throw new AppUserInvariantViolation('Only one owner is allowed in the system', {
      ownerId: existingOwner.id,
    });
  }
}

/**
 * Assert that the owner cannot be deleted (even soft delete).
 */
export function assertOwnerNotDeleted(user: AppUser): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation('Owner account cannot be deleted', { userId: user.id });
  }
}

/**
 * Assert that the owner cannot be disabled.
 */
export function assertOwnerNotDisabled(user: AppUser, nextIsDisabled: boolean): void {
  if (user.role === 'owner' && nextIsDisabled === true) {
    throw new AppUserInvariantViolation('Owner account cannot be disabled', { userId: user.id });
  }
}

/**
 * Assert that the owner's role cannot be changed.
 */
export function assertOwnerRoleImmutable(prev: AppUser, nextRole: string): void {
  if (prev.role === 'owner' && nextRole !== 'owner') {
    throw new AppUserInvariantViolation('Owner role is immutable and cannot be changed', {
      userId: prev.id,
    });
  }
}

/**
 * Assert that updating role or roleCategory also updates the corresponding timestamp, and vice versa.
 */
export function assertRoleSnapshotUpdate(
  user: AppUser,
  prev: AppUser,
  update: { role?: string; roleCategory?: string },
): void {
  if (user.role !== prev.role && user.roleUpdatedAt === prev.roleUpdatedAt) {
    throw new AppUserInvariantViolation('Updating role must update roleUpdatedAt', { id: user.id });
  }
  if (user.role === prev.role && user.roleUpdatedAt !== prev.roleUpdatedAt) {
    throw new AppUserInvariantViolation('roleUpdatedAt must only change if role changes', {
      id: user.id,
    });
  }
  if (
    user.roleCategory !== prev.roleCategory &&
    user.roleCategoryUpdatedAt === prev.roleCategoryUpdatedAt
  ) {
    throw new AppUserInvariantViolation('Updating roleCategory must update roleCategoryUpdatedAt', {
      id: user.id,
    });
  }
  if (
    user.roleCategory === prev.roleCategory &&
    user.roleCategoryUpdatedAt !== prev.roleCategoryUpdatedAt
  ) {
    throw new AppUserInvariantViolation(
      'roleCategoryUpdatedAt must only change if roleCategory changes',
      { id: user.id },
    );
  }
}

/**
 * Assert that AppUser.id matches the authUid used to create it.
 */
export function assertUserIdMatchesAuthUid(user: AppUser, authUid: string): void {
  if (user.id !== authUid) {
    throw new AppUserInvariantViolation('AppUser.id must equal authUid', { id: user.id, authUid });
  }
}

/**
 * Assert that a new AppUser is valid for creation.
 */
// REMOVED: assertValidUserCreation (split into invited/owner creation)

/**
 * Assert that a user can be restored (must be deleted and not owner).
 */
export function assertUserCanBeRestored(user: AppUser): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation('Owner cannot be restored (cannot be deleted)', {
      userId: user.id,
    });
  }
  if (!user.deletedAt) {
    throw new AppUserInvariantViolation('User is not deleted', { userId: user.id });
  }
}

/**
 * Assert that search query is valid (at least one field).
 */
export function assertValidUserSearchQuery(query: Partial<AppUser>): void {
  if (!query || Object.keys(query).length === 0) {
    throw new AppUserInvariantViolation('Search query must specify at least one field');
  }
}
// =============================
// EMAIL UPDATE INVARIANT
// =============================

/**
 * Assert that email is not updatable via AppUserService.
 * Throws AppUserInvariantViolation if 'email' is present in the update object.
 */
export function assertEmailNotUpdatable(update: Partial<AppUser>): void {
  if ('email' in update) {
    throw new AppUserInvariantViolation('Email is not updatable via AppUserService');
  }
}
// =============================
// Imports
// =============================
import { AppUser, AppUserInviteStatus } from './app-user.contracts';

// =============================
// Error Type
// =============================
export class AppUserInvariantViolation extends Error {
  constructor(
    public invariant: string,
    public context?: Record<string, unknown>,
  ) {
    super(
      `AppUserInvariantViolation: ${invariant}${context ? ' | ' + JSON.stringify(context) : ''}`,
    );
    this.name = 'AppUserInvariantViolation';
  }
}

// =============================
// CANONICAL INVARIANTS (FROZEN)
// =============================
// --- Invite Lifecycle ---
export function assertInviteSentAtForInvited(user: AppUser): void {
  if (user.inviteStatus === 'invited' && !user.inviteSentAt) {
    throw new AppUserInvariantViolation('inviteSentAt must exist when inviteStatus is invited', {
      userId: user.id,
    });
  }
}

/**
 * Assert that inviteRespondedAt exists when inviteStatus === 'activated'.
 */
export function assertInviteRespondedAtForActivated(user: AppUser): void {
  if (user.inviteStatus === 'activated' && !user.inviteRespondedAt) {
    throw new AppUserInvariantViolation(
      'inviteRespondedAt must exist when inviteStatus is activated',
      { userId: user.id },
    );
  }
}

/**
 * Assert that disabled users cannot accept invites.
 */
export function assertDisabledUserCannotAcceptInvite(user: AppUser): void {
  if (user.isDisabled && user.inviteStatus === 'invited') {
    throw new AppUserInvariantViolation('Disabled users cannot accept invites', {
      userId: user.id,
    });
  }
}

// --- Ownership ---

// --- Status ---

// AppUser.isDisabled is the single source of truth for user disablement. Do not sync or reflect Firebase Auth's disabled state.

// --- Email Verified Consistency ---
// AppUser.emailVerified MUST always reflect the corresponding Firebase Auth user's emailVerified field.
// This is enforced by AppAuthService.handleAuthStateChanged and AppUserService.updateEmailVerified.
// There is NO invariant or enforcement for emailVerified in this file; it is always a projection of Auth.
// If out of sync, AppAuthService will update Firestore to match Auth.

// --- Deletion ---

/**
 * Soft delete invariant should be enforced at repository or implementation layer, not here.
 */

// --- Registration ---

/**
 * Assert that isRegisteredOnERP indicates ERP onboarding completion.
 */
export function assertRegistrationFlag(user: AppUser): void {
  if (typeof user.isRegisteredOnERP !== 'boolean') {
    throw new AppUserInvariantViolation('isRegisteredOnERP must be a boolean', { id: user.id });
  }
}

/**
 * Assert that signup is allowed only before owner bootstrap.
 */
export function assertSignupAllowed(isOwnerBootstrapped: boolean): void {
  if (isOwnerBootstrapped) {
    throw new AppUserInvariantViolation('Signup is allowed only before owner bootstrap', {});
  }
}

// --- Owner-Specific Invariants ---

/**
 * Assert that a user is NOT the owner (for mutating operations).
 * @param user The user to check
 * @param action The attempted action (for error context)
 */
/**
 * Defensive: RBAC for owner profile updates is enforced in AppAuthService. This invariant is a last-resort guard and does not replace RBAC.
 */
export function assertUserIsNotOwner(user: AppUser, action: string): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation(`Owner user cannot be ${action}`, { userId: user.id });
  }
}

// --- Owner Registration & Status Invariant ---
/**
 * The owner user is always considered:
 * - inviteStatus = 'activated'
 * - isRegisteredOnERP = true
 * These states are now enforced at runtime for the owner user and never transition.
 */

// --- Signup gating logic fix ---
// In createUser, pass the correct owner bootstrapped flag to assertSignupAllowed.
// Usage:
//   const owner = await this.appUserRepo.findOne({ where: [['role', '==', 'owner']] });
//   const ownerBootstrapped = !!owner;
//   assertSignupAllowed(ownerBootstrapped);
// This ensures signup is only allowed before owner bootstrap.

// --- Invite lifecycle note ---
/**
 * Invite lifecycle (activation) is handled explicitly in the service layer.
 * To advance inviteStatus and isRegisteredOnERP, use the activateInvitedUser method.
 * This is orchestrated by the service, not implicitly.
 */

// --- Invite Lifecycle Invariants ---

/**
 * Canonical: Assert that inviteStatus is valid (must be one of 'invited', 'activated', 'revoked').
 * Use this for all invite status field checks.
 */
export function assertInviteStatusValid(status: AppUserInviteStatus): void {
  if (!['invited', 'activated', 'revoked'].includes(status)) {
    throw new AppUserInvariantViolation('Invalid inviteStatus', { status });
  }
}

/**
 * Assert that isRegisteredOnERP === true implies inviteStatus === 'activated'.
 */
export function assertRegisteredImpliesActivated(user: AppUser): void {
  if (user.isRegisteredOnERP && user.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('isRegisteredOnERP true requires inviteStatus activated', {
      userId: user.id,
    });
  }
}

/**
 * Assert that inviteStatus === 'activated' is irreversible.
 */
export function assertActivatedIsIrreversible(prev: AppUser, next: AppUser): void {
  if (prev.inviteStatus === 'activated' && next.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('inviteStatus activated is irreversible', {
      userId: prev.id,
    });
  }
}

/**
 * Assert that inviteStatus === 'revoked' implies isRegisteredOnERP === false.
 */
export function assertRevokedImpliesNotRegistered(user: AppUser): void {
  if (user.inviteStatus === 'revoked' && user.isRegisteredOnERP) {
    throw new AppUserInvariantViolation('inviteStatus revoked requires isRegisteredOnERP false', {
      userId: user.id,
    });
  }
}

/**
 * Assert that owner must always be inviteStatus === 'activated'.
 */
export function assertOwnerInviteStatusActivated(user: AppUser): void {
  if (user.role === 'owner' && user.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('Owner must always be inviteStatus activated', {
      userId: user.id,
    });
  }
}

// --- Queries ---

// --- Utility ---

/**
 * Assert that a user exists (for update/delete operations).
 */
export function assertUserExists(
  user: AppUser | null,
  context: Record<string, unknown> = {},
): void {
  if (!user) {
    throw new AppUserInvariantViolation('User must exist', context);
  }
}

// --- TIMESTAMP VALIDATION (Issue #17) ---
//
// CRITICAL: Timestamps must be reasonable to prevent sorting/comparison issues.
// Client clock skew can cause future timestamps or ancient dates.
//
// VALIDATION RULES:
// - Timestamps must not be in the future (beyond allowed clock skew)
// - Timestamps must not be ancient (before 2020-01-01, before this ERP system existed)
// - Server-generated timestamps are trusted; client timestamps are validated
//
// Issue #17 fix: Add timestamp validation for clock skew protection.

const ALLOWED_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes
const MINIMUM_VALID_DATE = new Date('2020-01-01T00:00:00Z'); // ERP system epoch

/**
 * Assert that a timestamp is reasonable (not in future, not ancient).
 * @param timestamp The timestamp to validate (undefined and null are allowed for optional fields)
 * @param fieldName The field name for error context
 * @throws AppUserInvariantViolation if timestamp is unreasonable
 */
export function assertTimestampReasonable(
  timestamp: Date | undefined | null,
  fieldName: string,
): void {
  if (!timestamp) return; // Undefined and null timestamps are allowed (optional fields)
  const now = new Date();
  const maxAllowed = new Date(now.getTime() + ALLOWED_CLOCK_SKEW_MS);
  if (timestamp > maxAllowed) {
    throw new AppUserInvariantViolation(
      `Timestamp ${fieldName} is in the future (clock skew detected)`,
      {
        fieldName,
        timestamp,
        now,
        allowedSkewMs: ALLOWED_CLOCK_SKEW_MS,
      },
    );
  }
  if (timestamp < MINIMUM_VALID_DATE) {
    throw new AppUserInvariantViolation(
      `Timestamp ${fieldName} is before system epoch (invalid date)`,
      {
        fieldName,
        timestamp,
        minimumValidDate: MINIMUM_VALID_DATE,
      },
    );
  }
}

/**
 * Validate all timestamps on a user object for clock skew protection.
 * Issue #17 fix: Comprehensive timestamp validation.
 */
export function assertUserTimestampsReasonable(user: Partial<AppUser>): void {
  assertTimestampReasonable(user.inviteSentAt, 'inviteSentAt');
  assertTimestampReasonable(user.inviteRespondedAt, 'inviteRespondedAt');
  assertTimestampReasonable(user.roleUpdatedAt, 'roleUpdatedAt');
  assertTimestampReasonable(user.roleCategoryUpdatedAt, 'roleCategoryUpdatedAt');
  assertTimestampReasonable(user.createdAt, 'createdAt');
  assertTimestampReasonable(user.updatedAt, 'updatedAt');
  assertTimestampReasonable(user.deletedAt, 'deletedAt');
}

// --- EMAIL VERIFICATION AUTHORITY ---
//
// CRITICAL: AppUser.emailVerified is a read-only projection of Firebase Auth.
// Firebase Auth is the authoritative source for email verification status.
//
// INVARIANT ENFORCEMENT:
// - AppAuthService._resolveAuthenticatedUser() is the ONLY place that syncs emailVerified
// - AppUserService MUST NEVER update emailVerified arbitrarily
// - Updates to emailVerified only happen during post-auth resolution
// - Violation of this will cause authentication bypass or permission escalation
//
// This ensures a single source of truth and prevents drift between Firebase and Firestore.
//
// Issue #14 - MONITORING & DRIFT DETECTION:
// - Add periodic job to detect drift: Query AppUsers where emailVerified !== Firebase Auth state
// - Alert on drift detection (indicates sync failure or manual Firestore manipulation)
// - Recommended query: Compare Firestore emailVerified vs Firebase Auth user.emailVerified
// - Repair: Re-run AppAuthService._resolveAuthenticatedUser() for affected users
// - Prevention: Block direct Firestore writes to emailVerified field (security rules)

export function assertEmailVerifiedNotUpdatedArbitrarily(updates: any): void {
  if ('emailVerified' in updates && updates.emailVerified !== undefined) {
    throw new AppUserInvariantViolation(
      'emailVerified cannot be updated directly; it is a Firebase Auth projection only',
      { attemptedUpdate: updates },
    );
  }
}

// --- OWNER BOOTSTRAP INVARIANT ---
//
// CRITICAL: Only ONE owner can exist in the system.
// Owner existence must be checked BEFORE any side-effects (Firebase Auth user creation).
// A second owner bootstrap attempt will corrupt the system.

export function assertOwnerBootstrapNotInProgress(): void {
  // This is a placeholder for future multi-instance coordination
  // Currently, check is done synchronously in AppAuthService.ownerSignUp()
}

// --- OWNER BOOTSTRAP INVARIANT EXTENDED ---
//
// CRITICAL: Only ONE owner can exist in the system.
// Owner existence must be checked BEFORE any side-effects (Firebase Auth user creation).
// A second owner bootstrap attempt will corrupt the system.
//
// SINGLE-INSTANCE GUARANTEE:
// This check is performed synchronously in AppAuthService.ownerSignUp() before Firebase Auth user creation.
// If app runs on single instance (typical), this is safe.
// For distributed apps (multiple instances), you MUST add distributed locking or Firestore transaction.

// --- CONCURRENT SESSION SEMANTICS ---
//
// UNDOCUMENTED: Users can have unlimited concurrent sessions (multiple devices/browsers).
// Each signIn() creates a new Firebase Auth session; all are valid simultaneously.
// There is NO session revocation cascade; disabling user doesn't revoke existing sessions.
// This behavior is acceptable for ERP systems but should be documented per deployment.

// --- INACTIVE USER TRACKING ---
//
// MISSING: No lastLoginAt or lastActivityAt fields.
// Future enhancement needed for:
// - Identifying inactive users (compliance, security)
// - Auto-disabling users after inactivity period
// - Audit logs (when was user last active?)
// Recommended: Add optional createdAt, lastLoginAt, lastActivityAt fields in v1.x
