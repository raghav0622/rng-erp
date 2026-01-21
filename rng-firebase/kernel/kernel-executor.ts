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
import { KernelInvariantViolationError } from '../kernel-errors';
import type { UserRepository } from '../repositories/user.repository';

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
    // Scope must be resolved explicitly via feature.scopeResolver or argument
    let scope: AssignmentScope | undefined = undefined;
    if (typeof feature.scopeResolver === 'function') {
      scope = feature.scopeResolver(ctx, input);
    }
    // Allow explicit argument override (if provided)
    if (!scope && input && typeof input === 'object' && 'scope' in input && (input as any).scope) {
      scope = (input as any).scope as AssignmentScope;
    }
    if (!scope) {
      throw new KernelInvariantViolationError(
        'Assignment scope could not be resolved deterministically',
      );
    }
    await this.rbacService.check({
      userId: user.id,
      role: user.role,
      feature: feature.feature,
      action: feature.action,
      scope,
    });

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
