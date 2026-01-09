// RBAC Actions Contract — Phase 0.5
// Defines what an "action" is, case sensitivity, wildcards, and unknown action handling.

/**
 * ACTION DEFINITION (Final)
 *
 * - An action is a string representing an operation on a feature (e.g., 'read', 'write', 'delete').
 * - Actions are case-sensitive ("Read" ≠ "read").
 * - Wildcards are strictly forbidden (no '*', no pattern matching).
 * - Unknown actions MUST be denied with reason ACTION_UNKNOWN.
 * - All action validation is deterministic and side-effect free.
 */
export type RBACAction = string;

export const RBAC_ACTION_RULES = {
  caseSensitive: true,
  allowWildcards: false,
  onUnknown: 'deny (reason: ACTION_UNKNOWN)',
};
