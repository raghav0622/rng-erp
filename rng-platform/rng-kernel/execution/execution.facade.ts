// FeatureExecutionFacade: Suspense-safe, promise-wrapped feature execution for UI and platform consumers
import type { AuditSink } from '../../domain/audit/audit.contract';
import type { CanonicalRole } from '../../domain/rbac/rbac.contract';
import type { RBACService } from '../../domain/rbac/rbac.service';
import type { User } from '../../domain/user/user.contract';
import type { FeatureDefinition } from '../feature-registry/feature-registry.contract';
import { executeFeature } from './execution.executor';

export interface FeatureExecutionFacadeOptions {
  user: User;
  role: CanonicalRole;
  feature: string;
  action: string;
  input: unknown;
  authEpoch: number;
  now: number;
  featureRegistry: ReadonlyArray<FeatureDefinition>;
  rbacService: RBACService;
  auditSink: AuditSink;
  scope?: unknown;
}

/**
 * Facade for feature execution. Wraps kernel executor in a suspense-safe promise.
 */
export function executeFeatureFacade<TInput, TResult>(
  opts: FeatureExecutionFacadeOptions,
): Promise<TResult> {
  // This can be extended to add suspense caching, error boundaries, etc.
  return executeFeature<TInput, TResult>(opts as any);
}
