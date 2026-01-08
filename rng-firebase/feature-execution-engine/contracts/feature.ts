// Phase 0: Feature Contracts (No Implementation)
// Defines CommandFeature and QueryFeature generic interfaces for the kernel.
import type { ExecutionContext } from '../../domain/auth/execution-context';

/**
 * CommandFeature contract
 *
 * Invariants:
 * - Features NEVER check auth
 * - Features NEVER check RBAC
 * - Context is trusted
 * - Repositories are allowed ONLY here
 */
export interface CommandFeature<TInput, TResult> {
  name: string;
  feature: string;
  action: string;
  requiresAuth: true;
  requiresRBAC: true;
  execute(ctx: ExecutionContext, input: TInput): Promise<TResult>;
}

/**
 * QueryFeature contract
 *
 * Invariants:
 * - Features NEVER check auth
 * - Features NEVER check RBAC
 * - Context is trusted
 * - Repositories are allowed ONLY here
 */
export interface QueryFeature<TResult> {
  name: string;
  feature: string;
  action: string;
  requiresAuth: true;
  requiresRBAC: true;
  query(ctx: ExecutionContext): Promise<TResult>;
}
