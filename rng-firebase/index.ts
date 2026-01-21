// Sealed Kernel Entrypoint
import type { RBACService } from './domain/rbac/rbac.service';
import { FeatureExecutionEngine } from './feature-execution-engine/FeatureExecutionEngine';
import { KernelInvariantViolationError } from './kernel-errors';
import { FeatureExecutionFacade } from './kernel/FeatureExecutionFacade';
import { KernelExecutor } from './kernel/kernel-executor';
import type { UserRepository } from './repositories/user.repository';

// The only public entrypoint: createFeatureExecutor
export function createFeatureExecutor({
  userRepo,
  rbacService,
}: {
  userRepo: UserRepository;
  rbacService: RBACService;
}) {
  const engine = new FeatureExecutionEngine();
  const executor = new KernelExecutor(userRepo, rbacService, engine);
  return new FeatureExecutionFacade(executor);
}

// All other APIs are sealed. No roadmap, no future surface.
export function createFeatureDSL() {
  throw new KernelInvariantViolationError('Not part of sealed kernel');
}
export function useFeatureHook() {
  throw new KernelInvariantViolationError('Not part of sealed kernel');
}
export function useAuthHook() {
  throw new KernelInvariantViolationError('Not part of sealed kernel');
}
export function useAuthGuard() {
  throw new KernelInvariantViolationError('Not part of sealed kernel');
}
