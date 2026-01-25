/**
 * @frozen v1
 * INTERNAL PUBLIC CONTRACT
 * AppUser invariant assertions.
 *
 * All invariants described here are strictly enforced at runtime in the service layer.
 * Breaking changes require v2.
 */

/**
 * AppUser Invariant Assertion Utilities
 *
 * Enforces all non-negotiable invariants for the AppUser Firestore projection.
 * Throws AppUserInvariantViolation on violation.
 *
 * All invariants described here are enforced at runtime in the service layer, unless otherwise noted.
 */

import {
  AppUser,
  AppUserInviteStatus,
  AppUserRole,
  CreateAppUser,
  UpdateAppUserRole,
} from './app-user.contracts';

/**
 * Error thrown when an AppUser invariant is violated.
 */
export class AppUserInvariantViolation extends Error {
  constructor(
    public invariant: string,
    public context?: any,
  ) {
    super(
      `AppUserInvariantViolation: ${invariant}${context ? ' | ' + JSON.stringify(context) : ''}`,
    );
    this.name = 'AppUserInvariantViolation';
  }
}

// --- Identity & Ownership ---

/**
 * Assert that AppUser.id matches the authUid used to create it.
 */
export function assertUserIdMatchesAuthUid(user: AppUser, authUid: string): void {
  if (user.id !== authUid) {
    throw new AppUserInvariantViolation('AppUser.id must equal authUid', { id: user.id, authUid });
  }
}

/**
 * Assert that no AppUser exists for the given authUid before creation.
 */
export function assertNoExistingUserForAuthUid(existing: AppUser | null, authUid: string): void {
  if (existing) {
    throw new AppUserInvariantViolation('Exactly one AppUser per authUid', { authUid });
  }
}

// --- Creation ---

/**
 * Assert that a new AppUser is valid for creation.
 */
export function assertValidUserCreation(
  input: CreateAppUser,
  existing: AppUser | null,
  authIdentityExists: boolean,
): void {
  if (existing) {
    throw new AppUserInvariantViolation('Cannot create AppUser if one already exists for authUid', {
      authUid: input.authUid,
    });
  }
  if (!authIdentityExists) {
    throw new AppUserInvariantViolation('Auth identity must exist before AppUser creation', {
      authUid: input.authUid,
    });
  }
}

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

// --- Role Snapshot (UI only) ---

/**
 * Assert that updating role or roleCategory also updates the corresponding timestamp, and vice versa.
 *
 * - If role changes, roleUpdatedAt must change.
 * - If role does not change, roleUpdatedAt must not change.
 * - If roleCategory changes, roleCategoryUpdatedAt must change.
 * - If roleCategory does not change, roleCategoryUpdatedAt must not change.
 */
export function assertRoleSnapshotUpdate(
  user: AppUser,
  prev: AppUser,
  update: UpdateAppUserRole,
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

// --- Status ---

/**
 * Assert that isDisabled reflects Auth-level disablement only.
 */
export function assertIsDisabledReflectsAuth(user: AppUser, authIsDisabled: boolean): void {
  if (user.isDisabled !== authIsDisabled) {
    throw new AppUserInvariantViolation('isDisabled must reflect Auth-level disablement', {
      id: user.id,
      isDisabled: user.isDisabled,
      authIsDisabled,
    });
  }
}

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
export function assertUserIsNotOwner(user: AppUser, action: string): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation(`Owner user cannot be ${action}`, { userId: user.id });
  }
}

/**
 * Assert that the owner's role cannot be changed.
 * @param prev The previous user state
 * @param nextRole The new role being set
 */
export function assertOwnerRoleImmutable(prev: AppUser, nextRole: AppUserRole): void {
  if (prev.role === 'owner' && nextRole !== 'owner') {
    throw new AppUserInvariantViolation('Owner role is immutable and cannot be changed', {
      userId: prev.id,
    });
  }
}

/**
 * Assert that the owner cannot be disabled.
 * @param user The user to check
 * @param nextIsDisabled The new isDisabled value
 */
export function assertOwnerNotDisabled(user: AppUser, nextIsDisabled: boolean): void {
  if (user.role === 'owner' && nextIsDisabled === true) {
    throw new AppUserInvariantViolation('Owner account cannot be disabled', { userId: user.id });
  }
}

/**
 * Assert that the owner cannot be deleted (even soft delete).
 * @param user The user to check
 */
export function assertOwnerNotDeleted(user: AppUser): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation('Owner account cannot be deleted', { userId: user.id });
  }
}

/**
 * Assert that only one owner can ever exist in the system.
 * @param existingOwner The existing owner user, if any
 */
export function assertNoExistingOwner(existingOwner: AppUser | null): void {
  if (existingOwner) {
    throw new AppUserInvariantViolation('Only one owner is allowed in the system', {
      ownerId: existingOwner.id,
    });
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
 * Assert that inviteStatus is valid.
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

/**
 * Assert that getUserById/getUserByEmail return null if not found (never throw).
 */
export function assertUserQueryReturnsNull(result: AppUser | null): void {
  if (result === undefined) {
    throw new AppUserInvariantViolation(
      'User queries must return null if not found, never undefined',
      {},
    );
  }
}

// --- Utility ---

/**
 * Assert that a user exists (for update/delete operations).
 */
export function assertUserExists(user: AppUser | null, context: any = {}): void {
  if (!user) {
    throw new AppUserInvariantViolation('User must exist', context);
  }
}
