import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthDisabledError,
  EmailNotVerifiedError,
  SignupNotAllowedError,
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
    await expect(executor.execute(feature, 'badid', {})).rejects.toThrow(SignupNotAllowedError);
  });

  it('rejects disabled user', async () => {
    userRepo.getById.mockResolvedValue({ ...baseUser, lifecycle: 'disabled' });
    await expect(executor.execute(feature, 'u1', {})).rejects.toThrow(AuthDisabledError);
  });

  it('rejects unverified email', async () => {
    userRepo.getById.mockResolvedValue({ ...baseUser, isEmailVerified: false });
    await expect(executor.execute(feature, 'u1', {})).rejects.toThrow(EmailNotVerifiedError);
  });

  it('rejects missing RBAC approval', async () => {
    userRepo.getById.mockResolvedValue(baseUser);
    rbacService.check.mockResolvedValue({ allowed: false, reason: 'ROLE_FORBIDDEN' });
    await expect(executor.execute(feature, 'u1', {})).rejects.toThrow(SignupNotAllowedError);
  });

  it('executes feature if all checks pass', async () => {
    userRepo.getById.mockResolvedValue(baseUser);
    rbacService.check.mockResolvedValue({ allowed: true, reason: 'ROLE_ALLOWED' });
    feature.execute.mockResolvedValue('ok');
    const result = await executor.execute(feature, 'u1', {});
    expect(result).toBe('ok');
  });
});
