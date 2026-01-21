import type { InviteRepository } from '../../../repositories/invite.repository';
import { InviteRevokedError, SignupNotAllowedError } from '../auth.errors';
import { InviteService } from '../invite.service';

describe('InviteService', () => {
  let inviteRepo: jest.Mocked<InviteRepository>;
  let service: InviteService;

  beforeEach(() => {
    inviteRepo = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      markAccepted: jest.fn(),
      revoke: jest.fn(),
      expire: jest.fn(),
    } as any;
    service = new InviteService(inviteRepo);
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
    inviteRepo.create.mockResolvedValue({
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

  it('should throw if no invite found on accept', async () => {
    inviteRepo.findByEmail.mockResolvedValue(null);
    await expect(service.acceptInviteAndCreateUser('a@b.com', 'pw', 'User')).rejects.toThrow(
      SignupNotAllowedError,
    );
  });

  it('should throw if invite is not pending', async () => {
    inviteRepo.findByEmail.mockResolvedValue({
      id: '1',
      email: 'a@b.com',
      role: 'manager',
      status: 'revoked',
    });
    await expect(service.acceptInviteAndCreateUser('a@b.com', 'pw', 'User')).rejects.toThrow(
      InviteRevokedError,
    );
  });

  // Add more tests for atomicity, revoke, expire as needed
});
