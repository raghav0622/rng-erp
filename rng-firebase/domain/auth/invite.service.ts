import { KernelErrorBase } from '../../kernel/errors/KernelErrorBase';
// KernelAtomicityViolationError for atomicity enforcement
export class KernelAtomicityViolationError extends KernelErrorBase {
  constructor(message: string) {
    super(message, 'KERNEL_ATOMICITY_VIOLATION');
    Object.setPrototypeOf(this, KernelAtomicityViolationError.prototype);
  }
}
// invite.service.ts
// InviteService: Enforces all invite invariants and atomicity for the kernel
import type { InviteRepository } from '../../repositories/invite.repository';
import type { UserRepository } from '../../repositories/user.repository';
import { SignupNotAllowedError } from './auth.errors';
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
  /**
   * Atomicity stub: This implementation does NOT guarantee atomicity between invite acceptance and user creation.
   * Always throws KernelAtomicityViolationError. Do NOT silently degrade.
   */
  async acceptInviteAndCreateUser(
    email: string,
    password: string,
    displayName: string,
  ): Promise<void> {
    throw new KernelAtomicityViolationError(
      'Invite acceptance and user creation is not atomic. This is an intentional stub.',
    );
  }

  async revokeInvite(inviteId: string): Promise<void> {
    await this.inviteRepo.revoke(inviteId);
  }

  async expireInvite(inviteId: string): Promise<void> {
    await this.inviteRepo.expire(inviteId);
  }
}
