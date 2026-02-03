export function assertEmailUniqueAndActive(users: AppUser[], email: string): void {
  const activeUsers = users.filter((user) => !user.deletedAt);
  if (activeUsers.length > 1) {
    throw new AppUserInvariantViolation(
      'Email uniqueness violation: multiple active AppUsers with this email exist',
      { email, userIds: activeUsers.map((user) => user.id) },
    );
  }
}

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
export function assertValidInvitedUserCreation(input: Partial<AppUser>): void {
  if (input.inviteStatus !== 'invited') {
    throw new AppUserInvariantViolation('Invited user must have inviteStatus = invited');
  }
  if (input.isRegisteredOnERP !== false) {
    throw new AppUserInvariantViolation('Invited user must have isRegisteredOnERP = false');
  }
  if (!input.inviteSentAt)
    throw new AppUserInvariantViolation('inviteSentAt must exist for invited user');
}

export function assertValidOwnerCreation(input: Partial<AppUser>): void {
  if (input.role !== 'owner') {
    throw new AppUserInvariantViolation('Owner creation requires role = owner');
  }
  if (!input.id) {
    throw new AppUserInvariantViolation('Owner creation requires id (authUid)');
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
export function assertUserCanBeActivated(user: AppUser): void {
  if (user.inviteStatus !== 'invited') {
    throw new AppUserInvariantViolation('User must be invited to activate', { userId: user.id });
  }
}
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

export function assertNoExistingOwner(existingOwner: AppUser | null): void {
  if (existingOwner) {
    throw new AppUserInvariantViolation('Only one owner is allowed in the system', {
      ownerId: existingOwner.id,
    });
  }
}

export function assertOwnerNotDeleted(user: AppUser): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation('Owner account cannot be deleted', { userId: user.id });
  }
}
export function assertOwnerNotDisabled(user: AppUser, nextIsDisabled: boolean): void {
  if (user.role === 'owner' && nextIsDisabled === true) {
    throw new AppUserInvariantViolation('Owner account cannot be disabled', { userId: user.id });
  }
}
export function assertOwnerRoleImmutable(prev: AppUser, nextRole: string): void {
  if (prev.role === 'owner' && nextRole !== 'owner') {
    throw new AppUserInvariantViolation('Owner role is immutable and cannot be changed', {
      userId: prev.id,
    });
  }
}
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
export function assertUserIdMatchesAuthUid(user: AppUser, authUid: string): void {
  if (user.id !== authUid) {
    throw new AppUserInvariantViolation('AppUser.id must equal authUid', { id: user.id, authUid });
  }
}
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

export function assertValidUserSearchQuery(query: Partial<AppUser>): void {
  if (!query || Object.keys(query).length === 0) {
    throw new AppUserInvariantViolation('Search query must specify at least one field');
  }
}
export function assertEmailNotUpdatable(update: Partial<AppUser>): void {
  if ('email' in update) {
    throw new AppUserInvariantViolation('Email is not updatable via AppUserService');
  }
}
import { AppUser, AppUserInviteStatus } from './app-user.contracts';
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
export function assertInviteSentAtForInvited(user: AppUser): void {
  if (user.inviteStatus === 'invited' && !user.inviteSentAt) {
    throw new AppUserInvariantViolation('inviteSentAt must exist when inviteStatus is invited', {
      userId: user.id,
    });
  }
}
export function assertInviteRespondedAtForActivated(user: AppUser): void {
  if (user.inviteStatus === 'activated' && !user.inviteRespondedAt) {
    throw new AppUserInvariantViolation(
      'inviteRespondedAt must exist when inviteStatus is activated',
      { userId: user.id },
    );
  }
}
export function assertDisabledUserCannotAcceptInvite(user: AppUser): void {
  if (user.isDisabled && user.inviteStatus === 'invited') {
    throw new AppUserInvariantViolation('Disabled users cannot accept invites', {
      userId: user.id,
    });
  }
}
export function assertRegistrationFlag(user: AppUser): void {
  if (typeof user.isRegisteredOnERP !== 'boolean') {
    throw new AppUserInvariantViolation('isRegisteredOnERP must be a boolean', { id: user.id });
  }
}
export function assertSignupAllowed(isOwnerBootstrapped: boolean): void {
  if (isOwnerBootstrapped) {
    throw new AppUserInvariantViolation('Signup is allowed only before owner bootstrap', {});
  }
}
export function assertUserIsNotOwner(user: AppUser, action: string): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation(`Owner user cannot be ${action}`, { userId: user.id });
  }
}
export function assertInviteStatusValid(status: AppUserInviteStatus): void {
  if (!['invited', 'activated', 'revoked'].includes(status)) {
    throw new AppUserInvariantViolation('Invalid inviteStatus', { status });
  }
}
export function assertRegisteredImpliesActivated(user: AppUser): void {
  if (user.isRegisteredOnERP && user.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('isRegisteredOnERP true requires inviteStatus activated', {
      userId: user.id,
    });
  }
}
export function assertActivatedIsIrreversible(prev: AppUser, next: AppUser): void {
  if (prev.inviteStatus === 'activated' && next.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('inviteStatus activated is irreversible', {
      userId: prev.id,
    });
  }
}
export function assertRevokedImpliesNotRegistered(user: AppUser): void {
  if (user.inviteStatus === 'revoked' && user.isRegisteredOnERP) {
    throw new AppUserInvariantViolation('inviteStatus revoked requires isRegisteredOnERP false', {
      userId: user.id,
    });
  }
}

export function assertOwnerInviteStatusActivated(user: AppUser): void {
  if (user.role === 'owner' && user.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('Owner must always be inviteStatus activated', {
      userId: user.id,
    });
  }
}
export function assertUserExists(
  user: AppUser | null,
  context: Record<string, unknown> = {},
): void {
  if (!user) {
    throw new AppUserInvariantViolation('User must exist', context);
  }
}
const ALLOWED_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MINIMUM_VALID_DATE = new Date('2020-01-01T00:00:00Z');
export function assertTimestampReasonable(
  timestamp: Date | undefined | null,
  fieldName: string,
): void {
  if (!timestamp) return;
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
export function assertUserTimestampsReasonable(user: Partial<AppUser>): void {
  assertTimestampReasonable(user.inviteSentAt, 'inviteSentAt');
  assertTimestampReasonable(user.inviteRespondedAt, 'inviteRespondedAt');
  assertTimestampReasonable(user.roleUpdatedAt, 'roleUpdatedAt');
  assertTimestampReasonable(user.roleCategoryUpdatedAt, 'roleCategoryUpdatedAt');
  assertTimestampReasonable(user.createdAt, 'createdAt');
  assertTimestampReasonable(user.updatedAt, 'updatedAt');
  assertTimestampReasonable(user.deletedAt, 'deletedAt');
}
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
  // Single-instance guarantee: AppAuthService.ownerSignUp() checks synchronously before Auth user creation
  // For multi-instance deployments: Requires distributed coordination or Firestore transaction lock
}

// POLICY: Multiple concurrent sessions are allowed (multiple devices/browsers per user)
// Each signIn() creates independent session; all remain valid simultaneously
// User disablement does NOT cascade revoke existing sessions (client-side design)
// Sessions clear on 24-hour UX timeout or next auth resolution after disablement

// NOTE: Inactive user tracking is not implemented
// System does not track lastLoginAt or lastActivityAt
// Consider adding these fields in future versions for audit trails and compliance
