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

import { normalizeEmail } from '../app-auth.service'; // Policy: Import shared normalization for consistency
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
  async deleteUserPermanently(userId: string): Promise<void> {
    const user = await this.appUserRepo.getById(userId, { includeDeleted: true });
    assertUserCanBeHardDeleted(user);
    await this.appUserRepo.delete(userId);
  }
  async restoreUser(userId: string, options?: { updateInviteSentAt?: boolean }): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId, { includeDeleted: true });
    assertUserExists(user);
    if (!user!.deletedAt) {
      throw new AppUserInvariantViolation('User is not deleted', { userId });
    }
    assertUserIsNotOwner(user!, 'restored');
    assertUserCanBeRestored(user!);
    if (user!.inviteStatus === 'invited') {
      if (!user!.inviteSentAt) {
        throw new AppUserInvariantViolation('Cannot restore invited user without inviteSentAt', {
          userId,
        });
      }
    }
    const wasDisabled = user!.isDisabled;
    globalLogger.info('[AppUserService] Restoring user with preserved isDisabled state', {
      userId,
      isDisabled: wasDisabled,
      preventResurrectionAttack: true,
      updateInviteSentAt: options?.updateInviteSentAt,
    });
    const updates: Partial<AppUser> = { deletedAt: undefined };
    if (options?.updateInviteSentAt && user!.inviteStatus === 'invited') {
      updates.inviteSentAt = new Date();
      updates.inviteRespondedAt = undefined;
      globalLogger.info('[AppUserService] Refreshing invite timestamp on restoration', {
        userId,
        newInviteSentAt: updates.inviteSentAt,
      });
    }
    const updated = await this.appUserRepo.update(userId, updates);
    if (updated.isDisabled !== wasDisabled) {
      throw new AppUserInvariantViolation(
        'isDisabled state not preserved during restoration (security vulnerability)',
        { userId, expected: wasDisabled, actual: updated.isDisabled },
      );
    }
    if (updated.inviteStatus === 'invited') {
      assertInviteSentAtForInvited(updated);
    }
    return updated;
  }
  async searchUsers(query: Partial<AppUser>, limit?: number): Promise<AppUser[]> {
    assertValidUserSearchQuery(query);
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
    const result = await this.appUserRepo.find({ where, limit });
    return result.data;
  }

  async reactivateUser(userId: string): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    if (!user!.isDisabled) {
      throw new AppUserInvariantViolation('User is not disabled', { userId });
    }
    assertUserIsNotOwner(user!, 'reactivated');
    const updated = await this.appUserRepo.update(userId, { isDisabled: false });
    return updated;
  }
  async listUsersPaginated(
    pageSize: number,
    pageToken?: string,
  ): Promise<{ data: AppUser[]; nextPageToken?: string; hasMore: boolean }> {
    if (pageToken !== undefined && typeof pageToken !== 'string') {
      throw new AppUserInvariantViolation('Invalid pagination token', { pageToken });
    }
    // Delegate to abstract repo which uses cursor-based pagination (nextCursor, hasMore)
    const result = await this.appUserRepo.find({ limit: pageSize, startAfter: pageToken });
    return {
      data: result.data,
      nextPageToken: result.nextCursor, // Translate abstract repo's nextCursor to nextPageToken
      hasMore: result.hasMore, // Include hasMore flag from abstract repo
    };
  }
  async resendInvite(data: ResendInvite): Promise<AppUser> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
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
    const updated: Partial<AppUser> = { inviteSentAt: new Date() };
    const result = await this.appUserRepo.update(data.userId, updated);
    return result;
  }
  async revokeInvite(data: RevokeInvite): Promise<AppUser> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);

    // Prevent revoking already-activated invites (race condition during concurrent signup)
    // Once an invite is activated, it cannot be revoked to preserve user access
    if (user!.inviteStatus === 'activated') {
      throw new AppUserInvariantViolation(
        'Cannot revoke already-activated invites (invitation has been accepted by user)',
        {
          userId: user!.id,
          inviteStatus: user!.inviteStatus,
          context:
            'Activated invites cannot be revoked. Use updateUserStatus to disable user if needed.',
        },
      );
    }

    if (user!.inviteStatus !== 'invited') {
      throw new AppUserInvariantViolation('Can only revoke users with inviteStatus=invited', {
        userId: user!.id,
        inviteStatus: user!.inviteStatus,
      });
    }

    const updated: Partial<AppUser> = {
      inviteStatus: 'revoked',
    };
    const result = await this.appUserRepo.update(data.userId, updated);
    return result;
  }
  private assertUserState(user: AppUser): void {
    // Invariant checks must not be swallowed; they represent state machine violations
    // Any failure here indicates data corruption and operation must be rejected
    try {
      assertInviteStatusValid(user.inviteStatus);
      assertRegisteredImpliesActivated(user);
      assertRevokedImpliesNotRegistered(user);
      if (user.role === 'owner') assertOwnerInviteStatusActivated(user);
    } catch (err) {
      globalLogger.error('[AppUserService] State machine violation detected - rejecting update', {
        error: err instanceof Error ? err.message : String(err),
        user,
      });
      throw err;
    }
  }
  private calculateRoleTimestamps(
    prev: Pick<AppUser, 'role' | 'roleCategory' | 'roleUpdatedAt' | 'roleCategoryUpdatedAt'> | null,
    next: Pick<AppUser, 'role' | 'roleCategory'>,
    now: Date,
  ): { roleUpdatedAt: Date; roleCategoryUpdatedAt: Date | undefined } {
    if (!prev) {
      return {
        roleUpdatedAt: now,
        roleCategoryUpdatedAt: next.roleCategory ? now : undefined,
      };
    }
    return {
      roleUpdatedAt: next.role !== prev.role ? now : prev.roleUpdatedAt,
      roleCategoryUpdatedAt:
        next.roleCategory !== prev.roleCategory ? now : prev.roleCategoryUpdatedAt,
    };
  }

  private appUserRepo = appUserRepo;

  private async getActiveUserByEmail(email: string): Promise<AppUser | null> {
    const result = await this.appUserRepo.find({
      where: [
        ['email', '==', email],
        ['deletedAt', '==', null],
      ],
    });
    assertEmailUniqueAndActive(result.data, email);
    const activeUser = result.data.find((user) => !user.deletedAt) ?? null;
    // Invariant: Repository query ensures deletedAt == null
    // Note: Multi-instance soft-delete race is possible - between finding no active user
    // and creating new user, another instance could restore with same email (eventual consistency).
    // This is an accepted constraint of client-side design.
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
    // BUG #16 FIX: UUID v4-like fallback with counter for true uniqueness
    // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y in [8,9,a,b]
    const chars = '0123456789abcdef';
    let id = '';
    for (let i = 0; i < 32; i++) {
      if (i === 12)
        id += '4'; // UUID v4 variant
      else if (i === 16)
        id += chars[(Math.random() * 4 + 8) | 0]; // UUID v4 variant
      else id += chars[(Math.random() * 16) | 0];
    }
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }
  async createUser(data: CreateOwnerUser | CreateInvitedUser): Promise<AppUser> {
    // BUG #15 FIX: Use shared email normalization function
    const normalizedEmail = normalizeEmail(data.email);
    let owner: AppUser | null = null;
    if (data.role === 'owner') {
      owner = await this.appUserRepo.findOne({ where: [['role', '==', 'owner']] });
      const ownerBootstrapped = !!owner;
      assertSignupAllowed(ownerBootstrapped);
    }
    const existingByEmail = await this.getActiveUserByEmail(normalizedEmail);
    if (existingByEmail) {
      throw new AppUserInvariantViolation('Cannot create AppUser: email already exists', {
        email: normalizedEmail,
      });
    }
    const now = new Date();
    let user: Omit<AppUser, 'createdAt' | 'updatedAt'>;
    if (data.role === 'owner') {
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
      // Validate the constructed user object
      assertValidOwnerCreation(user as AppUser);
    } else {
      const timestamps = this.calculateRoleTimestamps(null, data, now);
      // Policy: Capture inviteSentAt BEFORE any I/O to prevent timestamp drift on retries
      // If creation fails and is retried, inviteSentAt should remain consistent
      const inviteSentAt = new Date();
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
        inviteSentAt: inviteSentAt,
        inviteRespondedAt: undefined,
      };
      // Validate the constructed user object
      assertValidInvitedUserCreation(user as AppUser);
      // Invited users MUST NOT require authUid
      // (do not add authUid or any auth identity fields)
    }
    assertInviteStatusValid(user.inviteStatus);
    if (user.role === 'owner') assertOwnerInviteStatusActivated(user as AppUser);
    if (user.isRegisteredOnERP) assertRegisteredImpliesActivated(user as AppUser);
    if (user.inviteStatus === 'revoked') assertRevokedImpliesNotRegistered(user as AppUser);
    assertNewUserBaseDefaults(user as AppUser);
    assertUserTimestampsReasonable(user as AppUser);
    const created = await this.appUserRepo.create(user);
    return created;
  }
  async linkAuthIdentity(userId: string, authUid: string): Promise<void> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    if (user!.id === authUid) return; // Already linked (idempotent)
    if (user!.id !== userId)
      throw new AppUserInvariantViolation('User ID mismatch', { userId, id: user!.id });
    assertAuthIdentityNotLinked(user!, authUid);
    const existingAuthUser = await this.appUserRepo.getById(authUid, { includeDeleted: true });
    assertAuthUidNotLinked(existingAuthUser, authUid, userId);

    const { id, ...fields } = user!;

    // Invariant: Create disabled user and soft-delete original in sequential operations
    // Atomicity is not guaranteed at client layer; invariants guard state consistency
    // Future: Use Firestore transaction for true atomic delete + create
    try {
      // Rollback protection: Wrap in try-catch to detect and handle soft-delete failure
      await this.appUserRepo.create({ ...fields, id: authUid, isDisabled: true });
      const verifyDisabled = await this.appUserRepo.getById(authUid);
      if (!verifyDisabled || !verifyDisabled.isDisabled) {
        throw new AppUserInvariantViolation(
          'Failed to create disabled user during auth identity linking (security vulnerability)',
          { authUid, isDisabled: verifyDisabled?.isDisabled, userId },
        );
      }

      const softDeleteResult = await this.appUserRepo.update(userId, { deletedAt: new Date() });
      if (!softDeleteResult.deletedAt) {
        // Rollback: Delete the newly created disabled user on soft-delete failure
        // This prevents orphaned disabled users and allows safe retry
        try {
          await this.appUserRepo.delete(authUid);
          globalLogger.warn(
            '[AppUserService] Rolled back disabled user creation after soft-delete failure',
            {
              authUid,
              originalUserId: userId,
            },
          );
        } catch (rollbackErr) {
          globalLogger.error('[AppUserService] Rollback failed during linkAuthIdentity', {
            authUid,
            originalUserId: userId,
            rollbackError: rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
          });
        }
        throw new AppUserInvariantViolation(
          'Failed to soft-delete old invite record after linking auth identity',
          { userId, authUid },
        );
      }

      const verifyNew = await this.appUserRepo.getById(authUid);
      if (!verifyNew) {
        throw new AppUserInvariantViolation(
          'Linked auth identity record not found after creation',
          {
            authUid,
          },
        );
      }
      const verifyOld = await this.appUserRepo.getById(userId, { includeDeleted: false });
      if (verifyOld) {
        throw new AppUserInvariantViolation('Old invite record still active after soft delete', {
          userId,
        });
      }
    } catch (err) {
      // Re-throw with context
      if (err instanceof AppUserInvariantViolation) throw err;
      throw new AppUserInvariantViolation(
        'linkAuthIdentity failed: ' + (err instanceof Error ? err.message : String(err)),
        { userId, authUid, cause: err },
      );
    }
  }
  async updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    if (user!.role !== 'owner') {
      assertUserIsNotOwner(user!, 'updated');
    }
    assertEmailNotUpdatable(data as Partial<AppUser>);
    const updated: Partial<AppUser> = { ...data } as Partial<AppUser>;
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    return result;
  }
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
  async updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    assertOwnerNotDisabled(user!, data.isDisabled);
    const updated: Partial<AppUser> = { isDisabled: data.isDisabled };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    return result;
  }
  async deleteUser(data: DeleteAppUser): Promise<void> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    assertOwnerNotDeleted(user!);

    // If user is unregistered (invited but never signed up), hard delete the Firestore record
    const isUnregistered = user!.inviteStatus === 'invited' && !user!.isRegisteredOnERP;
    if (isUnregistered) {
      await this.appUserRepo.hardDelete(data.userId);
    } else {
      // For registered users, soft delete only (reversible)
      await this.appUserRepo.delete(data.userId);
    }
  }
  async getUserById(userId: string): Promise<AppUser | null> {
    return (await this.appUserRepo.getById(userId)) || null;
  }
  async getUserByEmail(email: string): Promise<AppUser | null> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.getActiveUserByEmail(normalizedEmail);
  }

  private static readonly LIST_USERS_HARD_LIMIT = 1000;
  async listUsers(): Promise<AppUser[]> {
    globalLogger.warn(
      'AppUserService.listUsers() is soft-deprecated. Use listUsersPaginated(pageSize: number) instead to avoid Firestore limits.',
    );
    const result = await this.appUserRepo.find({});
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
    // Policy: Check invite expiry to prevent stale invite acceptance
    // Invites expire after 30 days to avoid indefinite unresolved invitations
    if (user!.inviteSentAt) {
      const now = new Date();
      const daysSinceSent = (now.getTime() - user!.inviteSentAt.getTime()) / (1000 * 60 * 60 * 24);
      // Clock skew tolerance: Add 5-minute grace period to prevent false rejections
      // Accounts for time drift between client and server clocks
      const CLOCK_SKEW_MINUTES = 5;
      const CLOCK_SKEW_DAYS = CLOCK_SKEW_MINUTES / (24 * 60);
      if (daysSinceSent > AppUserService.INVITE_EXPIRY_DAYS + CLOCK_SKEW_DAYS) {
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
    assertInviteStatusValid(updated.inviteStatus!);
    assertRegisteredImpliesActivated({ ...user!, ...updated });
    assertActivatedIsIrreversible(user!, { ...user!, ...updated });
    assertInviteRespondedAtForActivated({ ...user!, ...updated });
    const result = await this.appUserRepo.update(userId, updated);
    return result;
  }
  async activateInvitedUser(userId: string): Promise<AppUser> {
    return this._activateInvitedUserInternal(userId);
  }
  async updateEmailVerified(userId: string, emailVerified: boolean): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    assertEmailVerifiedNotUpdatedArbitrarily({ emailVerified });
    if (user!.emailVerified === emailVerified) return user!;
    const updated: Partial<AppUser> = { emailVerified };
    const result = await this.appUserRepo.update(userId, updated);
    if (result.emailVerified !== emailVerified) {
      throw new AppUserInvariantViolation('emailVerified update failed to persist', {
        userId,
        expected: emailVerified,
        actual: result.emailVerified,
      });
    }
    return result;
  }

  async updateLastLoginAt(userId: string): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    const updated: Partial<AppUser> = { lastLoginAt: new Date() };
    const result = await this.appUserRepo.update(userId, updated);
    return result;
  }
}
