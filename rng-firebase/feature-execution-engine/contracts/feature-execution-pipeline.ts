// Central feature execution pipeline contract
// Enforces kernel execution order and error wrapping
import type { ExecutionContext } from '../../domain/auth/execution-context';

export interface FeatureExecutionPipeline {
  executeFeature<TInput, TResult>(
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
  ): Promise<TResult>;
}

/**
 * Pipeline guarantees:
 * - Auth is resolved first
 * - ExecutionContext is built and frozen
 * - RBAC is evaluated before feature execution
 * - Features cannot inspect role/assignments/call other features
 * - All feature errors are wrapped in FeatureExecutionError
 * - Error propagation is explicit
 */
