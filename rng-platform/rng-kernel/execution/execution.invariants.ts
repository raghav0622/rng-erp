// Execution Invariants
// No implementation. No runtime logic.

/**
 * ExecutionContext is immutable.
 * No mutation of context or input is allowed.
 * Features may not inspect role, assignments, or call other features.
 * Features may not mutate context or global state.
 * All invalidation is explicit and deterministic.
 */
export const EXECUTION_INVARIANTS = {
  CONTEXT_IMMUTABLE: true,
  NO_FEATURE_TO_FEATURE_CALLS: true,
  NO_ROLE_INSPECTION: true,
  NO_ASSIGNMENT_INSPECTION: true,
  NO_CONTEXT_MUTATION: true,
  INVALIDATION_EXPLICIT: true,
};
