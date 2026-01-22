import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthDisabledError,
  EmailNotVerifiedError,
  UserNotFoundError,
} from '../domain/auth/auth.errors';
import { ExecutionContextService } from '../domain/auth/execution-context.service';
import { FeatureExecutionEngine } from '../feature-execution-engine/FeatureExecutionEngine';
import { KernelExecutor } from '../kernel/kernel-executor';

const userRepo = {
  getById: vi.fn(),
};
const rbacService = {
  check: vi.fn(),
};
const engine = new FeatureExecutionEngine();
const executor = new KernelExecutor(userRepo as any, rbacService as any, engine);

const feature = {
  name: 'TestFeature',
  feature: 'test',
  action: 'run',
  requiresAuth: true as true,
  requiresRBAC: true as true,
  execute: vi.fn(async () => 'ok'),
};

const baseUser = {
  id: 'u1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'manager',
  isEmailVerified: true,
  lifecycle: 'active',
  source: 'bootstrap',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('KernelExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ExecutionContextService.__setEpoch(1);
  });

  it('rejects unauthenticated execution', async () => {
    userRepo.getById.mockResolvedValue(null);
    await expect(executor.execute(feature, 'badid', {})).rejects.toThrow(UserNotFoundError);
  });

  it('rejects disabled user', async () => {
    userRepo.getById.mockResolvedValue({ ...baseUser, lifecycle: 'disabled' });
    await expect(executor.execute(feature, 'u1', {})).rejects.toThrow(AuthDisabledError);
  });

  it('rejects unverified email', async () => {
    userRepo.getById.mockResolvedValue({ ...baseUser, isEmailVerified: false });
    await expect(executor.execute(feature, 'u1', {})).rejects.toThrow(EmailNotVerifiedError);
  });

  it('rejects missing RBAC approval (no scopeResolver)', async () => {
    userRepo.getById.mockResolvedValue(baseUser);
    rbacService.check.mockImplementation(() => {
      throw new (require('../domain/rbac/rbac.errors').RBACForbiddenError)(
        require('../domain/rbac/rbac.reasons').RBACDenialReason.ROLE_FORBIDDEN,
        'RBAC access denied',
      );
    });
    await expect(executor.execute(feature, 'u1', {})).rejects.toThrow(
      require('../domain/rbac/rbac.errors').RBACForbiddenError,
    );
  });

  it('executes feature if all checks pass', async () => {
    userRepo.getById.mockResolvedValue(baseUser);
    rbacService.check.mockImplementation(() => {}); // No throw means allowed
    feature.execute.mockResolvedValue('ok');
    const featureWithScope = {
      ...feature,
      scopeResolver: (): import('../domain/assignment/contract').AssignmentScope => ({
        type: 'feature',
      }),
    };
    const result = await executor.execute(featureWithScope, 'u1', {});
    expect(result).toBe('ok');
  });
});
