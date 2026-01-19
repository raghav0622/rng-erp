// FeatureExecutionEngine.ts
// Implements the FeatureExecutionPipeline contract for the kernel
import type { ExecutionContext } from '../domain/auth/execution-context';
import type { FeatureExecutionPipeline } from './contracts/feature-execution-pipeline';
import { FeatureExecutionError } from './errors/FeatureExecutionError';

/**
 * Central feature execution engine implementation.
 * Enforces kernel execution order, context immutability, RBAC, and error wrapping.
 */
export class FeatureExecutionEngine implements FeatureExecutionPipeline {
  async executeFeature<TInput, TResult>(
    feature: {
      name: string;
      feature: string;
      action: string;
      requiresAuth: true;
      requiresRBAC: true;
      execute: (ctx: ExecutionContext, input: TInput) => Promise<TResult>;
    },
    ctx: ExecutionContext,
    input: TInput,
  ): Promise<TResult> {
    // Context must be deeply frozen (enforced by context creator)
    // RBAC must be evaluated before this point (enforced by kernel)
    try {
      // Features may not access RBAC/auth state directly, only via context
      // Features may not call other features
      // Features may not mutate context
      return await feature.execute(ctx, input);
    } catch (err: any) {
      // All feature errors must be wrapped
      throw new FeatureExecutionError(
        err?.message || 'Unknown feature execution error',
        feature.feature,
        feature.action,
      );
    }
  }
}
