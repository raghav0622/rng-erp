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
 *
 * Feature Identity Rules:
 * - Each feature+action pair MUST be globally unique
 * - Feature/action names are case-sensitive
 * - No feature may perform side effects outside its declared action
 * - Features may not mutate ExecutionContext
 * - Features may not access RBAC or auth state directly
 * - Features may not call other features directly
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
 *
 * Feature Identity Rules:
 * - Each feature+action pair MUST be globally unique
 * - Feature/action names are case-sensitive
 * - No feature may perform side effects outside its declared action
 * - Features may not mutate ExecutionContext
 * - Features may not access RBAC or auth state directly
 * - Features may not call other features directly
 */
export interface QueryFeature<TResult> {
  name: string;
  feature: string;
  action: string;
  requiresAuth: true;
  requiresRBAC: true;
  query(ctx: ExecutionContext): Promise<TResult>;
}
