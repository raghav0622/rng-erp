import type { FirebaseAuthAdapter } from '../../adapters/firebase-auth.adapter';
import type { AssignmentRepository } from '../../repositories/assignment.repository';
import type { AuditRepository } from '../../repositories/audit.repository';
import type { InviteRepository } from '../../repositories/invite.repository';
import type { UserRepository } from '../../repositories/user.repository';
import {
  AuthDisabledError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  OwnerAlreadyExistsError,
  OwnerBootstrapError,
} from './auth.errors';
import { ExecutionContextService } from './execution-context.service';
import { InviteService } from './invite.service';

export class AuthServiceImpl {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly assignmentRepo: AssignmentRepository,
    private readonly auditRepo: AuditRepository,
    private readonly inviteRepo: InviteRepository,
    private readonly authAdapter: FirebaseAuthAdapter,
    private readonly inviteService: InviteService,
  ) {}

  /**
   * Sign out: invalidate session and ExecutionContext epoch, emit audit event.
   */
  async signOut(email: string): Promise<void> {
    await this.authAdapter.signOut();
    // Invalidate all contexts (epoch)
    ExecutionContextService.invalidateAll();
    await this.auditRepo.record({
      type: 'sign_out',
      email,
      timestamp: Date.now(),
    });
  }

  /**
   * Sign in: block disabled users, require email verification, map invalid credentials, restore session via adapter.
   * Emits audit events for success/failure.
   */
  async signIn(email: string, password: string): Promise<void> {
    const result = await this.authAdapter.signIn(email, password);
    if (!result.ok) {
      await this.auditRepo.record({
        type: 'sign_in_failed',
        email,
        reason: result.error?.message || 'Invalid credentials',
        timestamp: Date.now(),
      });
      throw new InvalidCredentialsError();
    }
    // Get user from repo
    const user = await this.userRepo.getByEmail(email);
    if (!user) {
      await this.auditRepo.record({
        type: 'sign_in_failed',
        email,
        reason: 'User not found',
        timestamp: Date.now(),
      });
      throw new InvalidCredentialsError('User not found');
    }
    if (user.lifecycle === 'disabled') {
      await this.auditRepo.record({
        type: 'sign_in_failed',
        email,
        reason: 'User disabled',
        timestamp: Date.now(),
      });
      throw new AuthDisabledError();
    }
    if (!user.isEmailVerified) {
      await this.auditRepo.record({
        type: 'sign_in_failed',
        email,
        reason: 'Email not verified',
        timestamp: Date.now(),
      });
      throw new EmailNotVerifiedError();
    }
    await this.auditRepo.record({
      type: 'sign_in_success',
      email,
      timestamp: Date.now(),
    });
    // Session restore is handled by adapter; nothing to return here
  }

  /**
   * Invited signup: requires valid invite, single-use, email match, marks invite accepted, user created with source='invite'.
   * Emits audit event on success/failure.
   */
  async signupWithInvite(email: string, password: string, displayName: string): Promise<void> {
    await this.inviteService.acceptInviteAndCreateUser(email, password, displayName);
    await this.auditRepo.record({
      type: 'invite_signup_success',
      email,
      timestamp: Date.now(),
    });
  }

  /**
   * Owner bootstrap: only allowed if no users exist, email matches OWNER_EMAIL, atomic, second attempt fails.
   * Emits audit event on success/failure.
   */
  async bootstrapOwner(email: string, password: string, displayName: string): Promise<void> {
    const userCount = await this.userRepo.count();
    if (userCount > 0) {
      await this.auditRepo.record({
        type: 'owner_bootstrap_failed',
        email,
        reason: 'Owner already exists',
        timestamp: Date.now(),
      });
      throw new OwnerAlreadyExistsError();
    }
    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail || email.toLowerCase() !== ownerEmail.toLowerCase()) {
      await this.auditRepo.record({
        type: 'owner_bootstrap_failed',
        email,
        reason: 'Email does not match OWNER_EMAIL',
        timestamp: Date.now(),
      });
      throw new OwnerBootstrapError('Email does not match OWNER_EMAIL');
    }
    // Try to create owner atomically
    try {
      await this.userRepo.createOwnerAtomically({
        email,
        displayName,
        role: 'owner',
        isEmailVerified: false,
        lifecycle: 'active',
        source: 'bootstrap',
      });
      await this.auditRepo.record({
        type: 'owner_bootstrap_success',
        email,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      await this.auditRepo.record({
        type: 'owner_bootstrap_failed',
        email,
        reason: err?.message || 'Unknown',
        timestamp: Date.now(),
      });
      if (err instanceof OwnerAlreadyExistsError) throw err;
      throw new OwnerBootstrapError(err?.message || 'Owner bootstrap failed');
    }
  }
}
