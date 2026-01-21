// kernel-executor.ts
// The ONLY public entry point for executing features in the kernel.
// Enforces: Auth, ExecutionContext, RBAC, FeatureExecutionEngine, Error wrapping.
import type { AssignmentScope } from '../domain/assignment/contract';
import {
  AuthDisabledError,
  EmailNotVerifiedError,
  UserNotFoundError,
} from '../domain/auth/auth.errors';
import { ExecutionContextService } from '../domain/auth/execution-context.service';
import type { RBACService } from '../domain/rbac/rbac.service';
import { FeatureExecutionEngine } from '../feature-execution-engine/FeatureExecutionEngine';
import type { CommandFeature } from '../feature-execution-engine/contracts/feature';
import { FeatureExecutionError } from '../feature-execution-engine/errors/FeatureExecutionError';
import type { UserRepository } from '../repositories/user.repository';
class KernelInvariantViolationError extends Error {
  readonly code = 'KERNEL_INVARIANT_VIOLATION';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, KernelInvariantViolationError.prototype);
  }
}

export class KernelExecutor {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly rbacService: RBACService,
    private readonly engine: FeatureExecutionEngine,
  ) {}

  /**
   * Executes a feature with full kernel enforcement.
   * @param feature Feature definition
   * @param userId Authenticated user id
   * @param input Raw feature input
   */
  async execute<TInput, TResult>(
    feature: CommandFeature<TInput, TResult>,
    userId: string,
    input: TInput,
  ): Promise<TResult> {
    // 1. Auth resolution
    const user = await this.userRepo.getById(userId);
    if (!user) throw new UserNotFoundError('User not found');
    if (user.lifecycle === 'disabled') throw new AuthDisabledError();
    if (!user.isEmailVerified) throw new EmailNotVerifiedError();

    // 2. ExecutionContext creation
    const ctx = ExecutionContextService.create(user);

    // 3. RBAC check
    // Scope must be explicit or deterministically derived
    let scope: AssignmentScope | undefined = undefined;
    if (input && typeof input === 'object') {
      if (
        'scope' in input &&
        (input as any).scope &&
        (typeof (input as any).scope === 'object' || typeof (input as any).scope === 'string')
      ) {
        scope = (input as any).scope as AssignmentScope;
      } else if ('resourceId' in input && typeof (input as any).resourceId === 'string') {
        scope = { type: 'resource', resourceId: (input as any).resourceId };
      } else {
        scope = { type: 'feature' };
      }
    } else {
      throw new KernelInvariantViolationError(
        'Assignment scope could not be resolved deterministically',
      );
    }
    if (!scope) {
      throw new KernelInvariantViolationError(
        'Assignment scope could not be resolved deterministically',
      );
    }
    const rbacResult = await this.rbacService.check({
      userId: user.id,
      role: user.role,
      feature: feature.feature,
      action: feature.action,
      scope,
    });
    if (!rbacResult.allowed) {
      // Only KernelExecutor throws RBACForbiddenError for denial
      const { RBACForbiddenError } = await import('../domain/rbac/rbac.errors');
      throw new RBACForbiddenError(rbacResult.reason);
    }

    // 4. Feature execution (internal only)
    try {
      return await this.engine.executeFeature(feature, ctx, input);
    } catch (err: any) {
      // 5. Error wrapping
      if (err instanceof FeatureExecutionError) throw err;
      throw new FeatureExecutionError(
        err?.message || 'Unknown feature error',
        feature.feature,
        feature.action,
      );
    }
  }
}
