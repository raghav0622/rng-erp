// execution-context.service.spec.ts
import { afterEach, describe, expect, it } from 'vitest';
import type { Role } from '../rbac/role';
import type { User, UserLifecycle } from '../user/contract';
import { ExecutionContextService } from './execution-context.service';
import { ExecutionContextInvalidError } from './ExecutionContextInvalidError';
import { ExecutionContextStaleError } from './ExecutionContextStaleError';

describe('ExecutionContextService', () => {
  const baseUser: User = Object.freeze({
    id: 'u1',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'manager' as Role,
    isEmailVerified: true,
    lifecycle: 'active' as UserLifecycle,
    source: 'bootstrap',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  afterEach(() => {
    // Reset epoch for isolation
    ExecutionContextService.__setEpoch(1);
  });

  it('creates a deeply frozen context with derived role and epoch', () => {
    const ctx = ExecutionContextService.create(baseUser);
    expect(ctx.user).toEqual(baseUser);
    expect(ctx.role).toBe(baseUser.role);
    expect(typeof ctx.now).toBe('number');
    expect(ctx.authEpoch).toBe(1);
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.user)).toBe(true);
  });

  it('throws if user is disabled', () => {
    const disabledUser = { ...baseUser, lifecycle: 'disabled' as UserLifecycle };
    expect(() => ExecutionContextService.create(disabledUser)).toThrow(
      ExecutionContextInvalidError,
    );
  });

  it('throws if context is stale (epoch mismatch)', () => {
    const ctx = ExecutionContextService.create(baseUser);
    ExecutionContextService.invalidateAll();
    expect(() => ExecutionContextService.validate(ctx)).toThrow(ExecutionContextStaleError);
  });

  it('throws if context user is disabled', () => {
    const disabledUser = { ...baseUser, lifecycle: 'disabled' as UserLifecycle };
    const ctx = ExecutionContextService.create(baseUser);
    // Simulate context with disabled user by replacing user reference (for test only)
    const fakeCtx = { ...ctx, user: disabledUser };
    expect(() => ExecutionContextService.validate(fakeCtx as any)).toThrow(
      ExecutionContextInvalidError,
    );
  });

  it('context cannot be mutated', () => {
    const ctx = ExecutionContextService.create(baseUser);
    expect(() => {
      (ctx as any).role = 'owner';
    }).toThrow();
    expect(() => {
      (ctx.user as any).email = 'hacked@example.com';
    }).toThrow();
  });

  it('role is always derived from user', () => {
    const user = { ...baseUser, role: 'employee' as Role };
    const ctx = ExecutionContextService.create(user);
    expect(ctx.role).toBe(user.role);
  });
});
