// ExecutionContext invariants (contract-only)
export const EXECUTION_CONTEXT_INVARIANTS = {
  IMMUTABLE: true,
  DEEPLY_FROZEN: true,
  NO_RAW_FIREBASE: true,
  NO_ENV: true,
  NO_ASSIGNMENTS_LIST: true,
  NO_ROLE_MUTATION: true,
  EPOCH_INVALIDATION: true,
};
