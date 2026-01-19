// execution-context.service.ts
import type { Role } from '../rbac/role';
import type { User } from '../user/contract';
import { ExecutionContextInvalidError } from './ExecutionContextInvalidError';
import { ExecutionContextStaleError } from './ExecutionContextStaleError';

export type ContextEpoch = number;

export interface ExecutionContext {
  user: User;
  role: Role;
  now: number;
  authEpoch: ContextEpoch;
}

/**
 * Internal in-memory epoch tracker (replace with repository/infra as needed)
 */
class ContextEpochManager {
  private currentEpoch: ContextEpoch = 1;
  getEpoch(): ContextEpoch {
    return this.currentEpoch;
  }
  bumpEpoch(): void {
    this.currentEpoch++;
  }
  setEpoch(epoch: ContextEpoch): void {
    this.currentEpoch = epoch;
  }
}

const epochManager = new ContextEpochManager();

export class ExecutionContextService {
  /**
   * Only entry point for creating a new ExecutionContext.
   * Deep-freezes context and attaches canonical user, derived role, now, and epoch.
   */
  static create(user: User): ExecutionContext {
    if (!user || user.lifecycle === 'disabled') {
      throw new ExecutionContextInvalidError('User is invalid or disabled');
    }
    const ctx: ExecutionContext = Object.freeze({
      user: Object.freeze({ ...user }),
      role: user.role,
      now: Date.now(),
      authEpoch: epochManager.getEpoch(),
    });
    return ctx;
  }

  /**
   * Validates that the context is still current and not stale.
   * Throws if context is invalid or stale.
   */
  static validate(ctx: ExecutionContext): void {
    if (!ctx || ctx.user.lifecycle === 'disabled') {
      throw new ExecutionContextInvalidError('Context user is invalid or disabled');
    }
    if (ctx.authEpoch !== epochManager.getEpoch()) {
      throw new ExecutionContextStaleError('Context is stale (epoch mismatch)');
    }
  }

  /**
   * Call when user.lifecycle, user.role, assignments, or signOut occurs.
   * Bumps the epoch, invalidating all existing contexts.
   */
  static invalidateAll(): void {
    epochManager.bumpEpoch();
  }

  /**
   * For test or infra: forcibly set epoch (not for app use)
   */
  static __setEpoch(epoch: ContextEpoch): void {
    epochManager.setEpoch(epoch);
  }
}
