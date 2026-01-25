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
  assertInviteStatusValid,
  assertIsDisabledReflectsAuth,
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

  async createUser(data: CreateAppUser): Promise<AppUser> {
    const owner = await this.appUserRepo.findOne({ where: [['role', '==', 'owner']] });
    const ownerBootstrapped = !!owner;
    assertSignupAllowed(ownerBootstrapped);
    // NOTE: In production, check auth identity existence here if needed
    const existingUser = await this.appUserRepo.getById(data.authUid);
    assertValidUserCreation(data, existingUser, true);
    if (data.role === 'owner') {
      assertNoExistingOwner(owner);
    }
    const now = new Date();
    // For owner, inviteStatus is always 'activated' and isRegisteredOnERP is always true (never transitions)
    let user: Omit<AppUser, 'createdAt' | 'updatedAt'>;
    // user will be constructed below, invariants checked after construction
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
    return created;
  }

  async updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    assertUserIsNotOwner(user!, 'updated');
    const updated: Partial<AppUser> = { ...data };
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

  async updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    assertOwnerNotDisabled(user!, data.isDisabled);
    // NOTE: In production, check Auth state for isDisabled if needed
    assertIsDisabledReflectsAuth({ ...user!, isDisabled: data.isDisabled }, data.isDisabled);
    const updated: Partial<AppUser> = { isDisabled: data.isDisabled };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    return result;
  }

  async deleteUser(data: DeleteAppUser): Promise<void> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    assertOwnerNotDeleted(user!);
    await this.appUserRepo.delete(data.userId); // Soft delete only
  }

  async getUserById(userId: string): Promise<AppUser | null> {
    return (await this.appUserRepo.getById(userId)) || null;
  }

  async getUserByEmail(email: string): Promise<AppUser | null> {
    return (await this.appUserRepo.findOne({ where: [['email', '==', email]] })) || null;
  }

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
    const result = await this.appUserRepo.update(userId, updated);
    return result;
  }
}
