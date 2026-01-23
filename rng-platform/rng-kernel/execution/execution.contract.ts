// Execution Contract
// No implementation. No runtime logic.

export interface ExecutionContext {
  readonly user: import('../../domain/user/user.contract').User;
  readonly role: import('../../domain/rbac/rbac.contract').CanonicalRole;
  readonly now: number;
  readonly authEpoch: number;
}

/**
 * Execution lifecycle:
 * 1. Auth
 * 2. Context construction
 * 3. RBAC check
 * 4. Feature execution
 * 5. Error handling
 */
export interface FeatureExecution {
  (ctx: ExecutionContext, input: unknown): unknown;
}
