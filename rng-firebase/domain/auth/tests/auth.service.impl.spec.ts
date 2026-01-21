import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthDisabledError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  OwnerAlreadyExistsError,
  OwnerBootstrapError,
  SignupNotAllowedError,
} from '../auth.errors';
import { AuthServiceImpl } from '../auth.service.impl';
import { ExecutionContextService } from '../execution-context.service';
import { InviteService } from '../invite.service';

// Mocks for repositories and adapter
const userRepo = {
  count: vi.fn(),
  getByEmail: vi.fn(),
  createOwnerAtomically: vi.fn(),
  create: vi.fn(),
};
const assignmentRepo = {};
const auditRepo = { record: vi.fn() };
const inviteRepo = { findByEmail: vi.fn(), markAccepted: vi.fn() };
const authAdapter = {
  signIn: vi.fn(),
  signOut: vi.fn(),
};
const inviteService = new InviteService(inviteRepo as any, userRepo as any);

const service = new AuthServiceImpl(
  userRepo as any,
  assignmentRepo as any,
  auditRepo as any,
  inviteRepo as any,
  authAdapter as any,
  inviteService as any,
);

describe('AuthServiceImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ExecutionContextService.__setEpoch(1);
  });

  it('fails owner bootstrap if user exists', async () => {
    userRepo.count.mockResolvedValue(1);
    await expect(service.createOwner('owner@example.com', 'pw')).rejects.toThrow(
      OwnerAlreadyExistsError,
    );
  });

  it('fails owner bootstrap if email does not match', async () => {
    userRepo.count.mockResolvedValue(0);
    process.env.OWNER_EMAIL = 'owner@example.com';
    await expect(service.createOwner('wrong@example.com', 'pw')).rejects.toThrow(
      OwnerBootstrapError,
    );
  });

  it('fails invited signup if invite not found', async () => {
    inviteRepo.findByEmail.mockResolvedValue(null);
    const fakeInvite = {
      id: 'i1',
      email: 'invitee@example.com',
      role: 'manager',
      status: 'pending' as const,
    };
    await expect(service.createUserWithInvite(fakeInvite, 'pw')).rejects.toThrow(
      SignupNotAllowedError,
    );
  });

  it('blocks sign in for disabled user', async () => {
    authAdapter.signIn.mockResolvedValue({ ok: true });
    userRepo.getByEmail.mockResolvedValue({ lifecycle: 'disabled' });
    await expect(service.signIn('disabled@example.com', 'pw')).rejects.toThrow(AuthDisabledError);
  });

  it('blocks sign in for unverified email', async () => {
    authAdapter.signIn.mockResolvedValue({ ok: true });
    userRepo.getByEmail.mockResolvedValue({ lifecycle: 'active', isEmailVerified: false });
    await expect(service.signIn('unverified@example.com', 'pw')).rejects.toThrow(
      EmailNotVerifiedError,
    );
  });

  it('blocks sign in for invalid credentials', async () => {
    authAdapter.signIn.mockResolvedValue({ ok: false, error: new Error('fail') });
    await expect(service.signIn('fail@example.com', 'pw')).rejects.toThrow(InvalidCredentialsError);
  });
});
