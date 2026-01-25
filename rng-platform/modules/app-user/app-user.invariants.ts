/**
 * =============================
 *  CANONICAL APPUSER INVARIANTS
 * =============================
 *
 * This file contains all invariants for AppUser Firestore projection.
 *
 * WARNING: This file is too large and mixes multiple domains (ownership, invite, registration, role, etc).
 * For maintainability, invariants should be split into:
 *   - ownership.ts
 *   - invite.ts
 *   - registration.ts
 *   - role.ts
 *
 * Canonical invariants are grouped below by domain. Deprecated invariants are clearly marked.
 *
 * If you add or update invariants, please group them under the correct section header.
 *
 * PHASE-2 TODO: Split this file into domain-specific modules.
 */

// =====================
// OWNERSHIP INVARIANTS
// =====================

/**
 * WARNING: This is a post-write, non-atomic, best-effort check.
 * It does NOT guarantee uniqueness or prevent corruption.
 * True uniqueness must be enforced at the data layer (transaction, unique index, or server-side logic).
 *
 * Assert that only one owner exists in the system at all times.
 * Should be checked after any user creation or role update.
 */
export async function assertExactlyOneOwner(appUserRepo: { find: Function }): Promise<void> {
  const owners = await appUserRepo.find({ where: [['role', '==', 'owner']] });
  if (owners.data.length > 1) {
    throw new AppUserInvariantViolation('Only one owner is allowed in the system', {
      ownerIds: owners.data.map((u: any) => u.id),
    });
  }
}

// =====================
// INVITE LIFECYCLE INVARIANTS
// =====================

// =====================
// REGISTRATION/PROFILE INVARIANTS
// =====================

/**
 * Assert that email is not updatable via AppUserService.
 * Should be checked in updateUserProfile.
 */
export function assertEmailNotUpdatable(update: Partial<AppUser>): void {
  if ('email' in update) {
    throw new AppUserInvariantViolation('Email is not updatable via AppUserService');
  }
}

// =====================
// EMAIL VERIFICATION INVARIANTS
// =====================

/**
 * Assert that emailVerified reflects Firebase Auth state.
 */
export function assertEmailVerifiedReflectsAuth(user: AppUser, authEmailVerified: boolean): void {
  if (user.emailVerified !== authEmailVerified) {
    throw new AppUserInvariantViolation(
      'emailVerified must reflect Auth email verification state',
      { userId: user.id },
    );
  }
}

// =====================
// ROLE SNAPSHOT INVARIANTS
// =====================
/**
 * @frozen
 * INTERNAL PUBLIC CONTRACT
 * AppUser invariant assertions.
 *
 * All invariants described here are strictly enforced at runtime in the service layer.
 * This file is extensible. Add new invariants as business rules evolve.
/**
 * Assert that a user can be restored (not owner, was soft-deleted).
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
 * Assert that a user can be reactivated (was disabled, not owner).
 */
export function assertUserCanBeReactivated(user: AppUser): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation('Owner cannot be reactivated (cannot be disabled)', {
      userId: user.id,
    });
  }
  if (!user.isDisabled) {
    throw new AppUserInvariantViolation('User is not disabled', { userId: user.id });
  }
}

/**
 * Assert that a user can be invited (not already invited, activated, or revoked).
 */
export function assertUserCanBeInvited(user: AppUser): void {
  if (user.inviteStatus !== 'revoked') {
    throw new AppUserInvariantViolation('User cannot be re-invited unless revoked', {
      userId: user.id,
    });
  }
}

/**
 * Canonical: Assert that a user can be activated (inviteStatus must be 'invited').
 * Use this for all invite activation transitions.
 */
export function assertUserCanBeActivated(user: AppUser): void {
  if (user.inviteStatus !== 'invited') {
    throw new AppUserInvariantViolation('User must be invited to activate', { userId: user.id });
  }
}

// =====================
// SEARCH VALIDATION INVARIANTS
// =====================

/**
 * Assert that search query is valid (at least one field).
 */
export function assertValidUserSearchQuery(query: Partial<AppUser>): void {
  if (!query || Object.keys(query).length === 0) {
    throw new AppUserInvariantViolation('Search query must specify at least one field');
  }
}

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

// AppUser.isDisabled is the single source of truth for user disablement. Do not sync or reflect Firebase Auth's disabled state.

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
export function assertUserExists(user: AppUser | null, context: any = {}): void {
  if (!user) {
    throw new AppUserInvariantViolation('User must exist', context);
  }
}
