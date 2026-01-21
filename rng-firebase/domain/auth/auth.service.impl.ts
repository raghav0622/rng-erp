import type { FirebaseAuthAdapter } from '../../adapters/firebase-auth.adapter';
import type { AssignmentRepository } from '../../repositories/assignment.repository';
import type { InviteRepository } from '../../repositories/invite.repository';
import type { UserRepository } from '../../repositories/user.repository';
import type { AuditService } from '../audit/audit.service';
import { assertUserSignInAllowed } from '../user/user.lifecycle';
import {
  AuthDisabledError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InviteRevokedError,
  OwnerAlreadyExistsError,
  OwnerBootstrapError,
  SessionInvalidatedError,
  SignupNotAllowedError,
  UserNotFoundError,
} from './auth.errors';
import type { AuthService } from './auth.service';
import type { AuthContextState, Invite } from './auth.types';
import { ExecutionContextService } from './execution-context.service';
import { InviteService } from './invite.service';

export class AuthServiceImpl implements AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly assignmentRepo: AssignmentRepository,
    private readonly auditService: AuditService,
    private readonly inviteRepo: InviteRepository,
    private readonly authAdapter: FirebaseAuthAdapter,
    private readonly inviteService: InviteService,
  ) {}

  async signIn(email: string, password: string): Promise<AuthContextState> {
    const result = await this.authAdapter.signIn(email, password);
    if (!result.ok) {
      await this.auditService.record({
        type: AuditEventType.USER_SIGNIN,
        actor: email,
        reason: result.error?.message || 'Invalid credentials',
        timestamp: Date.now(),
        details: { ok: false },
      });
      throw new InvalidCredentialsError();
    }
    const user = await this.userRepo.getByEmail(email);
    if (!user) {
      await this.auditService.record({
        type: AuditEventType.USER_SIGNIN,
        actor: email,
        reason: 'User not found',
        timestamp: Date.now(),
        details: { ok: false },
      });
      throw new UserNotFoundError('User not found');
    }
    try {
      assertUserSignInAllowed(user);
    } catch (err: any) {
      await this.auditService.record({
        type: AuditEventType.USER_SIGNIN,
        actor: email,
        reason: err?.message || 'User not allowed to sign in',
        timestamp: Date.now(),
        details: { ok: false },
      });
      if (err.code === 'USER_DISABLED') throw new AuthDisabledError();
      if (err.code === 'EMAIL_NOT_VERIFIED') throw new EmailNotVerifiedError();
      throw err;
    }
    await this.auditService.record({
      type: AuditEventType.USER_SIGNIN,
      actor: email,
      timestamp: Date.now(),
      details: { ok: true },
    });
    ExecutionContextService.invalidateAll();
    return {
      status: 'authenticated',
      user,
      now: Date.now(),
    };
  }

  async signOut(): Promise<void> {
    const result = await this.authAdapter.signOut();
    if (!result.ok) {
      throw new SessionInvalidatedError(result.error?.message || 'Sign out failed');
    }
    ExecutionContextService.invalidateAll();
    // No email context available, so no audit event for sign out
  }

  async createOwner(email: string, password: string): Promise<AuthContextState> {
    const userCount = await this.userRepo.count();
    if (userCount > 0) {
      throw new OwnerAlreadyExistsError();
    }
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail || email.toLowerCase() !== ownerEmail.toLowerCase()) {
      throw new OwnerBootstrapError('Email does not match OWNER_EMAIL');
    }
    try {
      await this.userRepo.createOwnerAtomically({
        email,
        displayName: email,
        role: 'owner',
        isEmailVerified: false,
        lifecycle: 'active',
        source: 'bootstrap',
      });
      const user = await this.userRepo.getByEmail(email);
      if (!user) throw new OwnerBootstrapError('Owner creation failed');
      ExecutionContextService.invalidateAll();
      return {
        status: 'owner_bootstrap_allowed',
        user,
        now: Date.now(),
      };
    } catch (err: any) {
      if (err instanceof OwnerAlreadyExistsError) throw err;
      throw new OwnerBootstrapError(err?.message || 'Owner bootstrap failed');
    }
  }

  async createUserWithInvite(invite: Invite, password: string): Promise<AuthContextState> {
    // Validate invite
    if (invite.status === 'revoked') throw new InviteRevokedError();
    if (invite.role !== 'manager' && invite.role !== 'employee') {
      throw new SignupNotAllowedError('Only manager or employee roles can be invited');
    }
    // Atomicity cannot be guaranteed; throw
    throw new SignupNotAllowedError('Invite signup is forbidden: atomicity cannot be guaranteed');
  }

  async sendEmailVerification(): Promise<void> {
    const result = await this.authAdapter.sendEmailVerification();
    if (!result.ok)
      throw new EmailNotVerifiedError(result.error?.message || 'Email verification failed');
  }

  async getCurrentState(): Promise<AuthContextState> {
    const result = await this.authAdapter.getCurrentUser();
    if (!result.ok) throw new SessionInvalidatedError(result.error?.message || 'Session invalid');
    const user = result.value;
    if (!user) {
      return {
        status: 'unauthenticated',
        user: null,
        now: Date.now(),
      };
    }
    // Map AuthUser to User (requires repo lookup)
    const domainUser = await this.userRepo.getByEmail(user.email);
    if (!domainUser) throw new UserNotFoundError('User not found');
    if (domainUser.lifecycle === 'disabled') {
      return {
        status: 'disabled',
        user: domainUser,
        now: Date.now(),
      };
    }
    if (!domainUser.isEmailVerified) {
      return {
        status: 'email_unverified',
        user: domainUser,
        now: Date.now(),
      };
    }
    return {
      status: 'authenticated',
      user: domainUser,
      now: Date.now(),
    };
  }
}
