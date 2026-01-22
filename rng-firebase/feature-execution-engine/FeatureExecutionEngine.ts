// FeatureExecutionEngine.ts
// Implements the FeatureExecutionPipeline contract for the kernel
import type { AuditService } from '../domain/audit/audit.service';
import { AuditEventType } from '../domain/audit/audit.types';
import type { ExecutionContext } from '../domain/auth/execution-context';
import { ExecutionContextService } from '../domain/auth/execution-context.service';
import type { RBACService } from '../domain/rbac/rbac.service';
import { KernelInvariantViolationError } from '../kernel-errors';
import type { FeatureExecutionPipeline } from './contracts/feature-execution-pipeline';

/**
 * @internal
 * Central feature execution engine implementation.
 * Enforces kernel execution order, context immutability, RBAC, and error wrapping.
 */
export class FeatureExecutionEngine implements FeatureExecutionPipeline {
  constructor(
    private readonly auditService: AuditService,
    private readonly rbacService: RBACService,
  ) {}

  async executeFeature<TInput, TResult>(
    feature: {
      name: string;
      feature: string;
      action: string;
      requiresAuth: true;
      requiresRBAC: true;
      execute: (ctx: ExecutionContext, input: TInput) => Promise<TResult>;
      scopeResolver?: (
        ctx: ExecutionContext,
        input: TInput,
      ) => import('../domain/assignment/contract').AssignmentScope;
    },
    ctx: ExecutionContext,
    input: TInput,
  ): Promise<TResult> {
    // Validate context epoch and immutability
    // This enforces kernel lifecycle even if engine is called directly
    // 1. Validate context epoch and immutability
    try {
      ExecutionContextService.validate(ctx);
    } catch (err: any) {
      await this.auditService.record({
        type: AuditEventType.FEATURE_FAILED,
        actor: ctx.user.id || 'system',
        target: feature.name,
        reason: 'ExecutionContextStaleError',
        timestamp: Date.now(),
        details: { feature, input, error: err },
      });
      throw err;
    }
    // 2. RBAC check (enforced here)
    if (typeof feature.scopeResolver !== 'function') {
      await this.auditService.record({
        type: AuditEventType.FEATURE_FAILED,
        actor: ctx.user.id || 'system',
        target: feature.name,
        reason: 'Missing scopeResolver for RBAC enforcement',
        timestamp: Date.now(),
        details: { feature, input },
      });
      throw new KernelInvariantViolationError('Missing scopeResolver for RBAC enforcement');
    }
    const scope = feature.scopeResolver(ctx, input);
    if (!scope) {
      await this.auditService.record({
        type: AuditEventType.FEATURE_FAILED,
        actor: ctx.user.id || 'system',
        target: feature.name,
        reason:
          'Assignment scope could not be resolved deterministically (scopeResolver returned undefined)',
        timestamp: Date.now(),
        details: { feature, input },
      });
      throw new KernelInvariantViolationError(
        'Assignment scope could not be resolved deterministically (scopeResolver returned undefined)',
      );
    }
    try {
      await this.rbacService.check({
        userId: ctx.user.id,
        role: ctx.user.role,
        feature: feature.feature,
        action: feature.action,
        scope,
      });
    } catch (err: any) {
      await this.auditService.record({
        type: AuditEventType.FEATURE_FAILED,
        actor: ctx.user.id || 'system',
        target: feature.name,
        reason: 'RBAC enforcement failed',
        timestamp: Date.now(),
        details: { feature, input, error: err },
      });
      throw err;
    }
    // 3. Feature execution
    try {
      const result = await feature.execute(ctx, input);
      await this.auditService.record({
        type: AuditEventType.FEATURE_EXECUTED,
        actor: ctx.user.id || 'system',
        target: feature.name,
        reason: 'Feature executed successfully',
        timestamp: Date.now(),
        details: { feature, input, result },
      });
      return result;
    } catch (error) {
      await this.auditService.record({
        type: AuditEventType.FEATURE_FAILED,
        actor: ctx.user.id || 'system',
        target: feature.name,
        reason:
          error instanceof KernelInvariantViolationError
            ? 'KernelInvariantViolationError'
            : 'Feature execution failed',
        timestamp: Date.now(),
        details: { feature, input, error },
      });
      throw error;
    }
  }
}
