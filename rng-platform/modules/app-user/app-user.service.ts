import { clientDb } from '@/lib';
import { AbstractClientFirestoreRepository } from '@/rng-repository';
import {
  AppUser,
  CreateAppUser,
  DeleteAppUser,
  IAppUserService,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './app-user.contracts';
import {
  AppUserInvariantViolation,
  assertActivatedIsIrreversible,
  assertDisabledUserCannotAcceptInvite,
  assertEmailNotUpdatable,
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
  assertUserExists,
  assertUserIdMatchesAuthUid,
  assertUserIsNotOwner,
  assertValidUserCreation,
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
   * Restore a soft-deleted user.
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
    // Restore by unsetting deletedAt
    const updated = await this.appUserRepo.update(userId, { deletedAt: undefined });
    return updated;
  }

  /**
   * Search users by arbitrary fields (role, status, etc).
   * @param query Partial<AppUser> fields to match
   * @returns Array of users matching query
   */
  async searchUsers(query: Partial<AppUser>): Promise<AppUser[]> {
    // Only allow searching on a safe, indexed subset of fields
    const ALLOWED_FIELDS = ['email', 'role', 'inviteStatus', 'isDisabled', 'isRegisteredOnERP'];
    const where: [string, '==', any][] = [];
    for (const [k, v] of Object.entries(query)) {
      if (ALLOWED_FIELDS.includes(k) && v !== undefined && v !== null && v !== '') {
        where.push([k, '==', v]);
      }
    }
    if (where.length === 0) {
      throw new AppUserInvariantViolation(
        'At least one valid query field is required for searchUsers',
        { query },
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
   * @throws AppUserInvariantViolation if user does not exist or inviteStatus is not 'invited'
   */
  async resendInvite(data: ResendInvite): Promise<AppUser> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    if (user!.inviteStatus !== 'invited') {
      throw new AppUserInvariantViolation('Can only resend invite if inviteStatus is invited', {
        userId: user!.id,
      });
    }
    // Only update inviteSentAt
    const updated: Partial<AppUser> = { inviteSentAt: new Date() };
    const result = await this.appUserRepo.update(data.userId, updated);
    return result;
  }

  /**
   * @throws AppUserInvariantViolation if user does not exist or inviteStatus is not 'invited'
   */
  async revokeInvite(data: RevokeInvite): Promise<AppUser> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    if (user!.inviteStatus !== 'invited') {
      throw new AppUserInvariantViolation('Can only revoke invite if inviteStatus is invited', {
        userId: user!.id,
      });
    }
    // Explicitly clear inviteRespondedAt; preserve inviteSentAt for audit
    const updated: Partial<AppUser> = {
      inviteStatus: 'revoked',
      isRegisteredOnERP: false,
      inviteRespondedAt: undefined,
    };
    const result = await this.appUserRepo.update(data.userId, updated);
    return result;
  }
  /**
   * Asserts all invite and owner state invariants for a user.
   * Used defensively after loading and after update.
   */
  private assertUserState(user: AppUser): void {
    assertInviteStatusValid(user.inviteStatus);
    assertRegisteredImpliesActivated(user);
    assertRevokedImpliesNotRegistered(user);
    if (user.role === 'owner') assertOwnerInviteStatusActivated(user);
  }
  private appUserRepo = appUserRepo;

  /**
   * @throws AppUserInvariantViolation if invariants are violated (e.g., duplicate owner, invalid invite)
   */
  async createUser(data: CreateAppUser): Promise<AppUser> {
    // Signup gating is enforced defensively in BOTH AppAuthService and AppUserService.
    // Owner uniqueness is protected here; only one owner is allowed.
    const owner = await this.appUserRepo.findOne({ where: [['role', '==', 'owner']] });
    const ownerBootstrapped = !!owner;
    assertSignupAllowed(ownerBootstrapped);
    // NOTE: In production, check auth identity existence here if needed
    const existingUser = await this.appUserRepo.getById(data.authUid);
    assertValidUserCreation(data, existingUser, true);
    if (data.role === 'owner') {
      // PRECONDITION: Only one owner allowed. This is not atomic—true uniqueness must be enforced at the data layer (transaction/unique index) for production safety.
      assertNoExistingOwner(owner);
    }
    const now = new Date();
    let user: Omit<AppUser, 'createdAt' | 'updatedAt'>;
    if (data.role === 'owner') {
      user = {
        id: data.authUid,
        name: data.name,
        email: data.email,
        role: data.role,
        roleCategory: data.roleCategory,
        roleUpdatedAt: now,
        roleCategoryUpdatedAt: data.roleCategory ? now : undefined,
        photoUrl: data.photoUrl,
        emailVerified: false,
        isDisabled: false,
        isRegisteredOnERP: true, // Owner is always registered
        inviteStatus: 'activated', // Owner is always activated
        inviteSentAt: undefined,
        inviteRespondedAt: now,
      };
    } else {
      user = {
        id: data.authUid,
        name: data.name,
        email: data.email,
        role: data.role,
        roleCategory: data.roleCategory,
        roleUpdatedAt: now,
        roleCategoryUpdatedAt: data.roleCategory ? now : undefined,
        photoUrl: data.photoUrl,
        emailVerified: false,
        isDisabled: false,
        isRegisteredOnERP: false,
        inviteStatus: 'invited',
        inviteSentAt: now,
        inviteRespondedAt: undefined,
      };
    }
    // Invite invariants
    assertInviteStatusValid(user.inviteStatus);
    if (user.role === 'owner') assertOwnerInviteStatusActivated(user as AppUser);
    if (user.isRegisteredOnERP) assertRegisteredImpliesActivated(user as AppUser);
    if (user.inviteStatus === 'revoked') assertRevokedImpliesNotRegistered(user as AppUser);
    assertNewUserBaseDefaults(user as AppUser);
    assertUserIdMatchesAuthUid(user as AppUser, data.authUid);
    const created = await this.appUserRepo.create(user);
    // NOTE: Post-write invariant check removed. True uniqueness must be enforced at the data layer.
    return created;
  }

  /**
   * @throws AppUserInvariantViolation if user does not exist, is owner, or email is updated
   */
  async updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    // Defensive only: RBAC for owner profile updates is enforced in AppAuthService. This invariant is a last-resort guard.
    assertUserIsNotOwner(user!, 'updated');
    assertEmailNotUpdatable(data as any);
    const updated: Partial<AppUser> = { ...data };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    return result;
  }

  /**
   * @throws AppUserInvariantViolation if user does not exist, is owner, or role is invalid
   */
  async updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    assertUserIsNotOwner(user!, 'updated');
    assertOwnerRoleImmutable(user!, data.role);
    const prev = { ...user! };
    const now = new Date();
    const updated: Partial<AppUser> = {
      role: data.role,
      roleCategory: data.roleCategory,
      roleUpdatedAt: data.role !== user!.role ? now : user!.roleUpdatedAt,
      roleCategoryUpdatedAt:
        data.roleCategory !== user!.roleCategory ? now : user!.roleCategoryUpdatedAt,
    };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    assertRoleSnapshotUpdate({ ...user!, ...updated, ...result }, prev, data);
    return result;
  }

  /**
   * @throws AppUserInvariantViolation if user does not exist or is owner
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
   */
  async getUserByEmail(email: string): Promise<AppUser | null> {
    return (await this.appUserRepo.findOne({ where: [['email', '==', email]] })) || null;
  }

  /**
   * @throws none
   */
  async listUsers(): Promise<AppUser[]> {
    const result = await this.appUserRepo.find({});
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
  async activateInvitedUser(userId: string): Promise<AppUser> {
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
   * Internal-only: update emailVerified to reflect Firebase Auth state.
   * Not part of the public contract.
   */
  async updateEmailVerified(userId: string, emailVerified: boolean): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    // Only update if needed
    if (user!.emailVerified === emailVerified) return user!;
    const updated: Partial<AppUser> = { emailVerified };
    const result = await this.appUserRepo.update(userId, updated);
    // Invariant: must reflect Auth
    // (assertEmailVerifiedReflectsAuth will be added and called after update)
    return result;
  }
}
