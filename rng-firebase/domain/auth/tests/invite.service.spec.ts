import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KernelErrorBase } from '../../../kernel/errors/KernelErrorBase';
import type { InviteRepository } from '../../../repositories/invite.repository';
import { SignupNotAllowedError } from '../auth.errors';
import { InviteService } from '../invite.service';

describe('InviteService', () => {
  let inviteRepo: InviteRepository;
  let userRepo: any;
  let service: InviteService;

  beforeEach(() => {
    inviteRepo = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      markAccepted: vi.fn(),
      revoke: vi.fn(),
      expire: vi.fn(),
    } as any;
    userRepo = {};
    service = new InviteService(inviteRepo, userRepo);
  });

  it('should only allow owner to create invites', async () => {
    await expect(
      service.createInvite({ email: 'a@b.com', role: 'manager', status: 'pending' }, 'employee'),
    ).rejects.toThrow(SignupNotAllowedError);
  });

  it('should only allow manager/employee roles', async () => {
    await expect(
      service.createInvite({ email: 'a@b.com', role: 'client', status: 'pending' }, 'owner'),
    ).rejects.toThrow(SignupNotAllowedError);
  });

  it('should create invite for valid role and owner', async () => {
    (inviteRepo.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      role: 'manager',
      status: 'pending',
    });
    const result = await service.createInvite(
      { email: 'a@b.com', role: 'manager', status: 'pending' },
      'owner',
    );
    expect(result.role).toBe('manager');
    expect(inviteRepo.create).toHaveBeenCalled();
  });

  it('should throw KernelAtomicityViolationError if no invite found on accept', async () => {
    (inviteRepo.findByEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(service.acceptInviteAndCreateUser('a@b.com', 'pw', 'User')).rejects.toSatisfy(
      (err: any) => {
        return err instanceof KernelErrorBase && err.code === 'KERNEL_ATOMICITY_VIOLATION';
      },
    );
  });

  it('should throw KernelAtomicityViolationError if invite is not pending', async () => {
    (inviteRepo.findByEmail as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      role: 'manager',
      status: 'revoked',
    });
    await expect(service.acceptInviteAndCreateUser('a@b.com', 'pw', 'User')).rejects.toSatisfy(
      (err: any) => {
        return err instanceof KernelErrorBase && err.code === 'KERNEL_ATOMICITY_VIOLATION';
      },
    );
  });

  it('should throw KernelAtomicityViolationError for atomicity stub', async () => {
    // This test documents the intentional terminal stub for atomicity
    // and ensures the kernel fails closed if atomicity is not implemented.
    const atomicityService = new InviteService(inviteRepo, userRepo);
    await expect(
      atomicityService.acceptInviteAndCreateUser('a@b.com', 'pw', 'User'),
    ).rejects.toSatisfy((err: any) => {
      return err instanceof KernelErrorBase && err.code === 'KERNEL_ATOMICITY_VIOLATION';
    });
  });
});
