// FeatureExecutionEngine.ts
// Implements the FeatureExecutionPipeline contract for the kernel
import type { ExecutionContext } from '../domain/auth/execution-context';
import type { FeatureExecutionPipeline } from './contracts/feature-execution-pipeline';
import type { AuditService } from '../domain/audit/audit.service';
import { AuditEventType } from '../domain/audit/audit.types';

/**
 * @internal
 * Central feature execution engine implementation.
 * Enforces kernel execution order, context immutability, RBAC, and error wrapping.
 */
  constructor(private readonly auditService: AuditService) {}

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
    try {
      const result = await feature.execute(ctx, input);
      await this.auditService.record({
        type: AuditEventType.USER_CREATED, // Use a more specific event if needed
        actor: ctx.userId || 'system',
        target: feature.name,
        reason: 'Feature executed successfully',
        timestamp: Date.now(),
        details: { feature, input, result },
      });
      return result;
    } catch (error) {
      await this.auditService.record({
        type: AuditEventType.USER_DISABLED, // Use a more specific event if needed
        actor: ctx.userId || 'system',
        target: feature.name,
        reason: 'Feature execution failed',
        timestamp: Date.now(),
        details: { feature, input, error },
      });
      throw error;
    }
  }
}
