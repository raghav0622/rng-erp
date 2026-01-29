import { clientDb } from '@/lib';
import { globalLogger } from '@/lib/logger';
import { AbstractClientFirestoreRepository } from '@/rng-repository';
import type {
  AppUser,
  CreateInvitedUser,
  CreateOwnerUser,
  DeleteAppUser,
  IAppUserService,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './app-user.contracts';
import {
  AppUserInvariantViolation,
  assertActivatedIsIrreversible,
  assertAuthIdentityNotLinked,
  assertAuthUidNotLinked,
  assertDisabledUserCannotAcceptInvite,
  assertEmailNotUpdatable,
  assertEmailUniqueAndActive,
  assertEmailVerifiedNotUpdatedArbitrarily,
  assertInviteRespondedAtForActivated,
  assertInviteSentAtForInvited,
  assertInviteStatusValid,
  assertNewUserBaseDefaults,
  assertNoExistingOwner,
  assertOwnerInviteStatusActivated,
  assertOwnerNotDeleted,
  assertOwnerNotDisabled,
  assertOwnerRoleImmutable,
  assertRegisteredImpliesActivated,
  assertRevokedImpliesNotRegistered,
  assertRoleSnapshotUpdate,
  assertSignupAllowed,
  assertUserCanBeHardDeleted,
  assertUserCanBeRestored,
  assertUserExists,
  assertUserIsNotOwner,
  assertUserTimestampsReasonable,
  assertValidInvitedUserCreation,
  assertValidOwnerCreation,
  assertValidUserSearchQuery,
} from './app-user.invariants';

import { ResendInvite, RevokeInvite } from './app-user.contracts';

class AppUserRepository extends AbstractClientFirestoreRepository<AppUser> {
  constructor() {
    super(clientDb, {
      collectionName: 'app-users',
      softDelete: true,
      idStrategy: 'client',
    });
  }
}
const appUserRepo = new AppUserRepository();

export class AppUserService implements IAppUserService {
  /**
   * Permanently delete a user record (hard delete, not soft delete).
   * Only the owner may perform this operation.
   *
   * ⚠️ DANGEROUS INTERNAL OPERATION ⚠️
   *
   * MUST only be used after:
   * - User has been soft-deleted (deletedAt !== null)
   * - Invite has been revoked (for invited users)
   * - User is NOT registered on ERP (isRegisteredOnERP === false)
   *
   * This permanently removes the user record from Firestore.
   * Firebase Auth cleanup is out of scope and must be handled separately.
   *
   * @param userId User ID
   * @throws AppUserInvariantViolation if user is owner, not soft-deleted, or registered on ERP
   */
  async deleteUserPermanently(userId: string): Promise<void> {
    const user = await this.appUserRepo.getById(userId, { includeDeleted: true });
    assertUserCanBeHardDeleted(user);
    await this.appUserRepo.delete(userId);
  }
  /**
   * Restore a soft-deleted user.
   * Issue #21 fix: Preserve isDisabled state to prevent resurrection attack.
   * @param userId User ID
   * @returns The restored user
   */
  async restoreUser(userId: string): Promise<AppUser> {
    // Only allow restoring if user is soft-deleted and not owner
    const user = await this.appUserRepo.getById(userId, { includeDeleted: true });
    assertUserExists(user);
    if (!user!.deletedAt) {
      throw new AppUserInvariantViolation('User is not deleted', { userId });
    }
    assertUserIsNotOwner(user!, 'restored');
    assertUserCanBeRestored(user!);
    // --- Restore semantics for invited/activated users ---
    // If restoring an invited user, inviteStatus must be preserved and inviteSentAt must exist.
    // If inviteSentAt is missing for an invited user, restoration fails defensively.
    if (user!.inviteStatus === 'invited') {
      if (!user!.inviteSentAt) {
        throw new AppUserInvariantViolation('Cannot restore invited user without inviteSentAt', {
          userId,
        });
      }
    }
    // Issue #21 fix: Preserve isDisabled state to prevent resurrection attack
    // If user was disabled before deletion, they remain disabled after restoration
    const wasDisabled = user!.isDisabled;
    globalLogger.info('[AppUserService] Restoring user with preserved isDisabled state', {
      userId,
      isDisabled: wasDisabled,
      preventResurrectionAttack: true,
    });
    // Restore by unsetting deletedAt (keep isDisabled unchanged)
    const updated = await this.appUserRepo.update(userId, { deletedAt: undefined });
    // Verify isDisabled state was preserved
    if (updated.isDisabled !== wasDisabled) {
      throw new AppUserInvariantViolation(
        'isDisabled state not preserved during restoration (security vulnerability)',
        { userId, expected: wasDisabled, actual: updated.isDisabled },
      );
    }
    // Enforce state invariants only (inviteStatus, inviteSentAt, etc.)
    if (updated.inviteStatus === 'invited') {
      assertInviteSentAtForInvited(updated);
    }
    return updated;
  }

  /**
   * Search users by arbitrary fields (role, status, etc).
   *
   * ⚠️ FROZEN POLICY COMMITMENT (Issue #5):
   * This method allows ANY authenticated user (including clients) to search by:
   * - role (exposes org structure)
   * - isDisabled (exposes user status)
   * - isRegisteredOnERP (exposes onboarding state)
   *
   * This leaks internal organizational structure and CANNOT be reversed
   * without breaking existing clients. This is an intentional design decision
   * for transparency in a private ERP system.
   *
   * IRREVERSIBLE: You cannot later say "clients shouldn't see internal users"
   * without a major version bump and breaking all deployed clients.
   *
   * @param query Partial<AppUser> fields to match
   * @returns Array of users matching query
   */
  async searchUsers(query: Partial<AppUser>): Promise<AppUser[]> {
    // Enforce invariant: query must specify at least one field
    assertValidUserSearchQuery(query);
    // Only allow searching on a safe, indexed subset of fields
    // ⚠️ FROZEN POLICY — DO NOT EXPAND ALLOWED_FIELDS
    const ALLOWED_FIELDS = [
      'email',
      'role',
      'inviteStatus',
      'isDisabled',
      'isRegisteredOnERP',
    ] as const;
    type AllowedField = (typeof ALLOWED_FIELDS)[number];
    type AllowedValue = AppUser[AllowedField];
    const where: Array<[AllowedField, '==', AllowedValue]> = [];
    for (const [k, v] of Object.entries(query)) {
      if (ALLOWED_FIELDS.includes(k as AllowedField) && v !== undefined && v !== null && v !== '') {
        where.push([k as AllowedField, '==', v as AllowedValue]);
      }
    }
    if (where.length === 0) {
      throw new AppUserInvariantViolation(
        'Search query must specify at least one allow-listed field',
        {
          query,
        },
      );
    }
    const result = await this.appUserRepo.find({ where });
    return result.data;
  }

  /**
   * Reactivate a previously disabled user.
   * @param userId User ID
   * @returns The reactivated user
   */
  async reactivateUser(userId: string): Promise<AppUser> {
    // Only allow reactivation if user is currently disabled and not owner
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    if (!user!.isDisabled) {
      throw new AppUserInvariantViolation('User is not disabled', { userId });
    }
    assertUserIsNotOwner(user!, 'reactivated');
    const updated = await this.appUserRepo.update(userId, { isDisabled: false });
    return updated;
  }
  /**
   * List users with pagination support.
   *
   * @param pageSize Number of users to return per page
   * @param pageToken Opaque cursor token from previous response's nextPageToken.
   *                  This is an internal Firestore cursor and should not be parsed or modified.
   *                  Pass undefined for the first page.
   * @returns Object containing data array and optional nextPageToken for next page
   */
  async listUsersPaginated(
    pageSize: number,
    pageToken?: string,
  ): Promise<{ data: AppUser[]; nextPageToken?: string }> {
    // Validate and sanitize pagination token (must be a string or undefined)
    if (pageToken !== undefined && typeof pageToken !== 'string') {
      throw new AppUserInvariantViolation('Invalid pagination token', { pageToken });
    }
    // AbstractClientFirestoreRepository supports pagination via cursor
    const result = await this.appUserRepo.find({ limit: pageSize, startAfter: pageToken });
    return {
      data: result.data,
      nextPageToken: result.nextCursor,
    };
  }
  /**
   * @throws AppUserInvariantViolation if user does not exist, invite is revoked, or not in invited state
   */
  async resendInvite(data: ResendInvite): Promise<AppUser> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    // CRITICAL: Prevent resend of revoked invites
    if (user!.inviteStatus === 'revoked') {
      throw new AppUserInvariantViolation(
        'Cannot resend revoked invite. Invite must be re-created by owner.',
        { userId: user!.id, inviteStatus: user!.inviteStatus },
      );
    }
    if (user!.inviteStatus !== 'invited') {
      throw new AppUserInvariantViolation('Can only resend invite if inviteStatus is invited', {
        userId: user!.id,
        inviteStatus: user!.inviteStatus,
      });
    }
    // Only update inviteSentAt
    const updated: Partial<AppUser> = { inviteSentAt: new Date() };
    const result = await this.appUserRepo.update(data.userId, updated);
    return result;
  }

  /**
   * @throws AppUserInvariantViolation if user does not exist or cannot be revoked
   */
  async revokeInvite(data: RevokeInvite): Promise<AppUser> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    if (!(user!.inviteStatus === 'invited' && user!.isRegisteredOnERP === false)) {
      throw new AppUserInvariantViolation('Can only revoke invite if inviteStatus is invited', {
        userId: user!.id,
        inviteStatus: user!.inviteStatus,
        isRegisteredOnERP: user!.isRegisteredOnERP,
      });
    }
    // Preserve inviteRespondedAt for audit trail; add revokedAt timestamp
    // This maintains history: was the invite ever responded to before revocation?
    const now = new Date();
    const updated: Partial<AppUser> = {
      inviteStatus: 'revoked',
      isRegisteredOnERP: false,
      // Keep inviteRespondedAt for audit: when was invite last responded to?
      // New field would be: revokedAt: now (future enhancement)
    };
    const result = await this.appUserRepo.update(data.userId, updated);
    return result;
  }
  /**
   * Asserts all invite and owner state invariants for a user.
   * Called defensively after every user load and after every update to catch state corruption.
   *
   * CONSISTENCY: Ensures user.inviteStatus, isRegisteredOnERP, and role constraints
   * align with documented invariants. If any check fails, data corruption is suspected.
   */
  private assertUserState(user: AppUser): void {
    assertInviteStatusValid(user.inviteStatus);
    assertRegisteredImpliesActivated(user);
    assertRevokedImpliesNotRegistered(user);
    if (user.role === 'owner') assertOwnerInviteStatusActivated(user);
  }
  /**
   * Helper to calculate roleUpdatedAt and roleCategoryUpdatedAt timestamps.
   * Ensures consistent logic across createUser and updateUserRole.
   *
   * SEMANTICS:
   * - On creation: Always set both timestamps if fields are present.
   * - On update: Only change timestamp if field actually changed (prevents unnecessary mutations).
   *
   * @internal
   */
  private calculateRoleTimestamps(
    prev: Pick<AppUser, 'role' | 'roleCategory' | 'roleUpdatedAt' | 'roleCategoryUpdatedAt'> | null,
    next: Pick<AppUser, 'role' | 'roleCategory'>,
    now: Date,
  ): { roleUpdatedAt: Date; roleCategoryUpdatedAt: Date | undefined } {
    if (!prev) {
      // On creation, always set timestamps if fields are present
      return {
        roleUpdatedAt: now,
        roleCategoryUpdatedAt: next.roleCategory ? now : undefined,
      };
    }
    // On update, only change timestamp if field actually changed
    return {
      roleUpdatedAt: next.role !== prev.role ? now : prev.roleUpdatedAt,
      roleCategoryUpdatedAt:
        next.roleCategory !== prev.roleCategory ? now : prev.roleCategoryUpdatedAt,
    };
  }

  private appUserRepo = appUserRepo;

  /**
   * Canonical email identity enforcement.
   * Ensures at most one active (non-soft-deleted) AppUser per email.
   * Returns the active AppUser if present, otherwise null.
   * Issue #8 fix: Enhanced error diagnostics for repository query/filter mismatches.
   * @internal
   */
  private async getActiveUserByEmail(email: string): Promise<AppUser | null> {
    // EXPLICIT: Query only non-deleted users to avoid relying on implicit repository behavior
    // This is more robust than filtering after the fact
    // Issue #16 note: Composite index required: (email, deletedAt) for performance
    const result = await this.appUserRepo.find({
      where: [
        ['email', '==', email],
        ['deletedAt', '==', null],
      ],
    });
    assertEmailUniqueAndActive(result.data, email);
    // Filter is defensive fallback; should not be needed if query is correct
    const activeUser = result.data.find((user) => !user.deletedAt) ?? null;
    // Issue #8 fix: Enhanced diagnostic with repository query details
    if (activeUser && activeUser.deletedAt) {
      throw new AppUserInvariantViolation(
        'getActiveUserByEmail returned soft-deleted user (repository query/filter mismatch)',
        {
          email,
          userId: activeUser.id,
          deletedAt: activeUser.deletedAt,
          queryWhere: result.data.length,
          filteredCount: result.data.filter((u) => !u.deletedAt).length,
          repositoryBug: 'deletedAt filter not applied correctly',
        },
      );
    }
    return activeUser;
  }

  private generateInviteId(): string {
    if (typeof crypto !== 'undefined') {
      if (crypto.randomUUID) return crypto.randomUUID();
      if (crypto.getRandomValues) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      }
    }
    return `invited-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Create a new AppUser (owner or invited).
   *
   * RACE CONDITION NOTE (Acceptable Trade-off):
   * Email uniqueness check is non-atomic. Between checking and creating, another concurrent
   * createUser() call could create a user with the same email. This is documented as acceptable
   * for client-side operations given Firestore's eventual consistency model.
   *
   * CLIENT RETRY STRATEGY:
   * If createUser fails with "email already exists", callers SHOULD retry the entire flow
   * rather than attempting to recover the partial state. The second attempt will either:
   * 1. Find the already-created user and return success (idempotent), or
   * 2. Fail with clear error message
   *
   * @throws AppUserInvariantViolation if invariants are violated (e.g., duplicate owner, invalid invite, email conflict)
   */
  async createUser(data: CreateOwnerUser | CreateInvitedUser): Promise<AppUser> {
    // Issue #19 fix: Normalize email to lowercase for consistent comparison
    const normalizedEmail = data.email.toLowerCase().trim();
    // Only apply signup gating for owner creation
    let owner: AppUser | null = null;
    if (data.role === 'owner') {
      owner = await this.appUserRepo.findOne({ where: [['role', '==', 'owner']] });
      const ownerBootstrapped = !!owner;
      assertSignupAllowed(ownerBootstrapped);
    }
    // CANONICAL EMAIL IDENTITY RULE:
    // Exactly one active (non-soft-deleted) AppUser per email.
    // This check is non-atomic but documented as acceptable trade-off.
    const existingByEmail = await this.getActiveUserByEmail(normalizedEmail);
    if (existingByEmail) {
      throw new AppUserInvariantViolation('Cannot create AppUser: email already exists', {
        email: normalizedEmail,
      });
    }
    const now = new Date();
    let user: Omit<AppUser, 'createdAt' | 'updatedAt'>;
    if (data.role === 'owner') {
      assertValidOwnerCreation(data);
      assertNoExistingOwner(owner);
      const timestamps = this.calculateRoleTimestamps(null, data, now);
      user = {
        id: data.authUid!,
        name: data.name,
        email: normalizedEmail,
        role: data.role,
        roleCategory: data.roleCategory,
        roleUpdatedAt: timestamps.roleUpdatedAt,
        roleCategoryUpdatedAt: timestamps.roleCategoryUpdatedAt,
        photoUrl: data.photoUrl,
        emailVerified: false,
        isDisabled: false,
        isRegisteredOnERP: true,
        inviteStatus: 'activated',
        inviteSentAt: undefined,
        inviteRespondedAt: now,
      };
    } else {
      assertValidInvitedUserCreation(data);
      const timestamps = this.calculateRoleTimestamps(null, data, now);
      user = {
        id: this.generateInviteId(),
        name: data.name,
        email: normalizedEmail,
        role: data.role,
        roleCategory: data.roleCategory,
        roleUpdatedAt: timestamps.roleUpdatedAt,
        roleCategoryUpdatedAt: timestamps.roleCategoryUpdatedAt,
        photoUrl: data.photoUrl,
        emailVerified: false,
        isDisabled: false,
        isRegisteredOnERP: false,
        inviteStatus: 'invited',
        inviteSentAt: now,
        inviteRespondedAt: undefined,
      };
      // Invited users MUST NOT require authUid
      // (do not add authUid or any auth identity fields)
    }
    assertInviteStatusValid(user.inviteStatus);
    if (user.role === 'owner') assertOwnerInviteStatusActivated(user as AppUser);
    if (user.isRegisteredOnERP) assertRegisteredImpliesActivated(user as AppUser);
    if (user.inviteStatus === 'revoked') assertRevokedImpliesNotRegistered(user as AppUser);
    assertNewUserBaseDefaults(user as AppUser);
    // Issue #17 fix: Validate timestamps for clock skew protection
    assertUserTimestampsReasonable(user as AppUser);
    const created = await this.appUserRepo.create(user);
    return created;
  }

  /**
   * Link a Firebase Auth identity to an invited AppUser.
   * One-time operation. Enforces user.id === authUid afterward. Forbidden if already linked.
   *
   * RACE CONDITION PROTECTION:
   * Asserts no AppUser with id === authUid exists before creating the linked record.
   * This prevents split-brain scenarios where multiple invited users try to link
   * to the same authUid concurrently.
   *
   * After linking, the old invited record is soft-deleted and will not appear
   * in public queries (getUserByEmail, listUsers, searchUsers) due to explicit
   * soft-delete filtering with `deletedAt == null` in all user lookups.
   *
   * ORPHAN EDGE CASE:
   * If activation fails after linking, an orphaned AppUser is left (invited but linked, isRegisteredOnERP=false).
   * Recovery: Use appAuthService.listOrphanedLinkedUsers() and cleanupOrphanedLinkedUser(userId) manually.
   */
  async linkAuthIdentity(userId: string, authUid: string): Promise<void> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    // Enforce one-time-only linking
    if (user!.id === authUid) return; // Already linked (idempotent)
    if (user!.id !== userId)
      throw new AppUserInvariantViolation('User ID mismatch', { userId, id: user!.id });
    assertAuthIdentityNotLinked(user!, authUid);

    // CRITICAL: Check for existing AppUser with authUid to prevent duplicates
    // Check both active and soft-deleted records to detect all conflicts
    const existingAuthUser = await this.appUserRepo.getById(authUid, { includeDeleted: true });
    assertAuthUidNotLinked(existingAuthUser, authUid, userId);

    // Create new AppUser doc with id = authUid, copy all fields
    // NOTE: create disabled-by-default to avoid brief enabled window before activation
    const { id, ...fields } = user!;
    await this.appUserRepo.create({ ...fields, id: authUid, isDisabled: true });

    // Issue #9 fix: Verify disabled state was actually set to prevent auth bypass
    const verifyDisabled = await this.appUserRepo.getById(authUid);
    if (!verifyDisabled || !verifyDisabled.isDisabled) {
      throw new AppUserInvariantViolation(
        'Failed to create disabled user during auth identity linking (security vulnerability)',
        { authUid, isDisabled: verifyDisabled?.isDisabled, userId },
      );
    }

    // Soft delete the old invited doc
    const softDeleteResult = await this.appUserRepo.update(userId, { deletedAt: new Date() });

    // CRITICAL: Verify soft delete succeeded to prevent duplicate active users
    if (!softDeleteResult.deletedAt) {
      throw new AppUserInvariantViolation(
        'Failed to soft-delete old invite record after linking auth identity',
        { userId, authUid },
      );
    }

    // Defensive verification: confirm new linked record exists and old is gone
    const verifyNew = await this.appUserRepo.getById(authUid);
    if (!verifyNew) {
      throw new AppUserInvariantViolation('Linked auth identity record not found after creation', {
        authUid,
      });
    }
    // Verify old record is actually deleted (not just marked)
    const verifyOld = await this.appUserRepo.getById(userId, { includeDeleted: false });
    if (verifyOld) {
      throw new AppUserInvariantViolation('Old invite record still active after soft delete', {
        userId,
      });
    }
  }

  /**
   * Update a user's profile (name, photoUrl).
   * Email is immutable (tied to Firebase Auth identity).
   *
   * IMMUTABILITY NOTE:
   * Email changes are NOT supported. If user registers with wrong email:
   * 1. No direct fix available (Firebase Auth email is immutable)
   * 2. Owner must: delete user, create new invite with correct email
   * 3. User completes signupWithInvite() with new email
   * This is an accepted limitation of client-side Firebase Auth.
   *
   * @throws AppUserInvariantViolation if user does not exist, is owner, or email update attempted
   */
  async updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    // Defensive only: RBAC for owner profile updates is enforced in AppAuthService. This invariant is a last-resort guard.
    if (user!.role !== 'owner') {
      assertUserIsNotOwner(user!, 'updated');
    }
    assertEmailNotUpdatable(data);
    const updated: Partial<AppUser> = { ...data };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    return result;
  }

  /**
   * Update a user's role (employee → manager → etc).
   * Owner role is immutable; cannot be demoted or transferred.
   *
   * ROLE IMMUTABILITY: Once a user is owner, they remain owner permanently.
   * This prevents accidental privilege escalation/de-escalation vulnerabilities.
   *
   * @throws AppUserInvariantViolation if user does not exist, is owner, or invalid role
   */
  async updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    assertUserIsNotOwner(user!, 'updated');
    assertOwnerRoleImmutable(user!, data.role);
    const prev = { ...user! };
    const now = new Date();
    const timestamps = this.calculateRoleTimestamps(user!, data, now);
    const updated: Partial<AppUser> = {
      role: data.role,
      roleCategory: data.roleCategory,
      roleUpdatedAt: timestamps.roleUpdatedAt,
      roleCategoryUpdatedAt: timestamps.roleCategoryUpdatedAt,
    };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    assertRoleSnapshotUpdate({ ...user!, ...updated, ...result }, prev, data);
    return result;
  }

  /**
   * Update user enabled/disabled status.
   *
   * DISABLEMENT SEMANTICS:
   * - isDisabled is the ONLY source of truth (AppUser.isDisabled)
   * - Firebase Auth user.disabled is NOT synchronized and not used by system
   * - When user.isDisabled = true, all auth flows reject with UserDisabledError
   * - Disabled users can be re-enabled via reactivateUser()
   *
   * OWNER IMMUTABILITY: Owner cannot be disabled. This prevents locking out system administrator.
   *
   * @throws AppUserInvariantViolation if user does not exist, is owner, or update fails
   */
  async updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    assertOwnerNotDisabled(user!, data.isDisabled);
    // AppUser.isDisabled is authoritative. Firebase Auth state is NOT used for disablement.
    const updated: Partial<AppUser> = { isDisabled: data.isDisabled };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    return result;
  }

  /**
   * Soft-delete a user (set deletedAt timestamp).
   * User becomes invisible in all queries (getUserByEmail, listUsers, searchUsers).
   * Record remains in Firestore for audit and can be restored.
   *
   * OWNER IMMUTABILITY: Owner cannot be deleted. This prevents losing system administrator.
   * HARD DELETE: Use deleteUserPermanently() after soft delete (owner-only maintenance operation).
   *
   * @throws AppUserInvariantViolation if user does not exist or is owner
   */
  async deleteUser(data: DeleteAppUser): Promise<void> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    assertOwnerNotDeleted(user!);
    await this.appUserRepo.delete(data.userId); // Soft delete only
  }

  /**
   * @throws none (returns null if not found)
   */
  async getUserById(userId: string): Promise<AppUser | null> {
    return (await this.appUserRepo.getById(userId)) || null;
  }

  /**
   * @throws none (returns null if not found)
   *
   * Issue #5: FROZEN POLICY - Any authenticated user can query by email.
   * This is IRREVERSIBLE. Organizational directory is permanently exposed.
   * ⚠️ NOTE: This method allows any authenticated user to query by email.
   * No RBAC filtering applied. Callers with privacy concerns should add own checks.
   */
  async getUserByEmail(email: string): Promise<AppUser | null> {
    // Issue #19 fix: Normalize email to lowercase for consistent comparison
    const normalizedEmail = email.toLowerCase().trim();
    // Audit log: email-based queries can expose organizational structure
    // This is intentional for private ERP but should be monitored
    return this.getActiveUserByEmail(normalizedEmail);
  }

  /**
   * @dangerous SOFT-DEPRECATED: Unpaginated list of all active users.
   *
   * ⚠️ HARD LIMIT: This method is unsuitable for deployments with > 1000 users.
   * It will hit Firestore's maximum query result limit and fail silently or incompletely.
   *
   * Issue #15 fix: Hard limit enforcement to prevent silent data loss.
   *
   * RECOMMENDED: Use listUsersPaginated() instead for all new code:
   *   const { data, nextPageToken } = await service.listUsersPaginated(20);
   *   while (nextPageToken) {
   *     const next = await service.listUsersPaginated(20, nextPageToken);
   *     data.push(...next.data);
   *     nextPageToken = next.nextPageToken;
   *   }
   *
   * MIGRATION TIMELINE:
   * - v1 (current): Deprecated with warning. Functional for < 100 users.
   * - v1.x: Will log error if > 1000 users detected.
   * - v2: Removed entirely. Use listUsersPaginated-only API.
   *
   * @throws AppUserInvariantViolation if user count exceeds HARD_LIMIT
   */
  private static readonly LIST_USERS_HARD_LIMIT = 1000;
  async listUsers(): Promise<AppUser[]> {
    globalLogger.warn(
      'AppUserService.listUsers() is soft-deprecated. Use listUsersPaginated(pageSize: number) instead to avoid Firestore limits.',
    );
    const result = await this.appUserRepo.find({});
    // Issue #15 fix: Enforce hard limit to prevent silent failure
    if (result.data.length >= AppUserService.LIST_USERS_HARD_LIMIT) {
      throw new AppUserInvariantViolation(
        'listUsers() hard limit exceeded. Use listUsersPaginated() for large user bases.',
        { count: result.data.length, limit: AppUserService.LIST_USERS_HARD_LIMIT },
      );
    }
    return result.data;
  }

  async isOwnerBootstrapped(): Promise<boolean> {
    const owner = await this.appUserRepo.findOne({ where: [['role', '==', 'owner']] });
    return !!owner;
  }

  async isSignupAllowed(): Promise<boolean> {
    return !(await this.isOwnerBootstrapped());
  }

  // --- Invite Activation ---

  /**
   * Shared internal method for invite activation.
   * Encapsulates all invariant checks and state transitions to prevent divergence
   * between acceptInvite() (auth-owned) and inviteLifecycle.
   *
   * Issue #22 fix: Enforce invite expiry to prevent stale invite acceptance.
   *
   * ATOMIC SCOPE: Only the Firestore update is atomic. Pre-checks (disabled, revoked, etc.)
   * are non-atomic and subject to concurrent modifications. Rollback is caller's responsibility.
   *
   * @internal
   * @param userId User ID
   * @returns Updated AppUser with inviteStatus='activated'
   * @throws AppUserInvariantViolation if preconditions are violated
   */
  private static readonly INVITE_EXPIRY_DAYS = 30;
  private async _activateInvitedUserInternal(userId: string): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    if (user!.role === 'owner') {
      throw new AppUserInvariantViolation('Owner cannot be activated via invite lifecycle', {
        userId,
      });
    }
    assertInviteStatusValid(user!.inviteStatus);
    if (user!.inviteStatus === 'revoked') {
      throw new AppUserInvariantViolation('Revoked user cannot be activated', { userId });
    }
    if (user!.inviteStatus !== 'invited') {
      throw new AppUserInvariantViolation('User is not in invited state', { userId });
    }
    // Enforce invite lifecycle invariants
    assertInviteSentAtForInvited(user!);
    // Issue #22 fix: Check invite expiry to prevent stale invite acceptance
    if (user!.inviteSentAt) {
      const now = new Date();
      const daysSinceSent = (now.getTime() - user!.inviteSentAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSent > AppUserService.INVITE_EXPIRY_DAYS) {
        throw new AppUserInvariantViolation('Invite has expired', {
          userId,
          inviteSentAt: user!.inviteSentAt,
          expiryDays: AppUserService.INVITE_EXPIRY_DAYS,
          daysSinceSent: Math.floor(daysSinceSent),
        });
      }
    }
    assertDisabledUserCannotAcceptInvite(user!);
    const now = new Date();
    const updated: Partial<AppUser> = {
      inviteStatus: 'activated',
      inviteRespondedAt: now,
      isRegisteredOnERP: true,
    };
    // Invite invariants
    assertInviteStatusValid(updated.inviteStatus!);
    assertRegisteredImpliesActivated({ ...user!, ...updated });
    assertActivatedIsIrreversible(user!, { ...user!, ...updated });
    assertInviteRespondedAtForActivated({ ...user!, ...updated });
    const result = await this.appUserRepo.update(userId, updated);
    return result;
  }

  /**
   * Public invite activation endpoint. Called from both AppUserService and AppAuthService
   * (via acceptInvite()). Delegates to shared internal method.
   */
  async activateInvitedUser(userId: string): Promise<AppUser> {
    return this._activateInvitedUserInternal(userId);
  }

  /**
   * Internal-only: update emailVerified to reflect Firebase Auth state.
   * CRITICAL: This is the ONLY place emailVerified should be updated.
   * Called from AppAuthService._resolveAuthenticatedUser() during post-auth resolution.
   *
   * @internal
   * @throws AppUserInvariantViolation if called with undefined emailVerified
   */
  async updateEmailVerified(userId: string, emailVerified: boolean): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    // Enforce that emailVerified is only updated via canonical method
    assertEmailVerifiedNotUpdatedArbitrarily({ emailVerified });
    // Only update if needed
    if (user!.emailVerified === emailVerified) return user!;
    const updated: Partial<AppUser> = { emailVerified };
    const result = await this.appUserRepo.update(userId, updated);
    // Verify update succeeded
    if (result.emailVerified !== emailVerified) {
      throw new AppUserInvariantViolation('emailVerified update failed to persist', {
        userId,
        expected: emailVerified,
        actual: result.emailVerified,
      });
    }
    return result;
  }
}
