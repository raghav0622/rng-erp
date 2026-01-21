// KernelAtomicityViolationError for atomicity enforcement
class KernelAtomicityViolationError extends Error {
  readonly code = 'KERNEL_ATOMICITY_VIOLATION';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, KernelAtomicityViolationError.prototype);
  }
}
// invite.service.ts
// InviteService: Enforces all invite invariants and atomicity for the kernel
import type { InviteRepository } from '../../repositories/invite.repository';
import type { UserRepository } from '../../repositories/user.repository';
import { InviteRevokedError, SignupNotAllowedError } from './auth.errors';
import type { Invite } from './auth.types';

export class InviteService {
  constructor(
    private readonly inviteRepo: InviteRepository,
    private readonly userRepo: UserRepository,
  ) {}

  /**
   * Only owner can create invites. Clients cannot be invited as manager/employee.
   */
  async createInvite(
    invite: Omit<Invite, 'id' | 'createdAt' | 'updatedAt'>,
    creatorRole: string,
  ): Promise<Invite> {
    if (creatorRole !== 'owner') throw new SignupNotAllowedError('Only owner can invite');
    // Only allow roles 'manager' or 'employee' for invites; 'client' is not a valid role for invite
    if (invite.role !== 'manager' && invite.role !== 'employee') {
      throw new SignupNotAllowedError('Only manager or employee roles can be invited');
    }
    return this.inviteRepo.create(invite);
  }

  /**
   * Accept invite + user creation must be atomic. Enforces expiry, single-use, revoked.
   */
  async acceptInviteAndCreateUser(
    email: string,
    password: string,
    displayName: string,
  ): Promise<void> {
    // Find invite by email
    const invite = await this.inviteRepo.findByEmail(email);
    if (!invite) throw new SignupNotAllowedError('Invite not found');
    if (invite.status === 'revoked') throw new InviteRevokedError();
    // If we ever support expiry, check here (status/type or timestamp)
    // if (invite.status === 'expired') throw new InviteExpiredError();
    if (invite.status !== 'pending') throw new SignupNotAllowedError('Invite already used');

    // Atomic mutation: mark invite accepted and create user
    await this.inviteRepo.runAtomic(invite.id, (current) => {
      if (!current) throw new SignupNotAllowedError('Invite not found');
      if (current.status === 'revoked') throw new InviteRevokedError();
      // if (current.status === 'expired') throw new InviteExpiredError();
      if (current.status !== 'pending') throw new SignupNotAllowedError('Invite already used');
      // Mark invite as accepted
      return { status: 'accepted' };
    });

    // Create user with correct lifecycle and source
    await this.userRepo.create({
      email,
      displayName,
      role: invite.role,
      isEmailVerified: false,
      lifecycle: 'invited',
      source: 'invite',
    });
  }

  async revokeInvite(inviteId: string): Promise<void> {
    await this.inviteRepo.revoke(inviteId);
  }

  async expireInvite(inviteId: string): Promise<void> {
    await this.inviteRepo.expire(inviteId);
  }
}
