// RBAC invariants and documentation for Phase 2

/**
 * RBAC INVARIANTS (MANDATORY)
 *
 * - Every RBAC decision has a reason
 * - Owner bypass cannot be disabled
 * - Missing role config is a hard error
 * - Assignments cannot grant owner-only actions
 * - Violations MUST throw
 */

export const RBAC_INVARIANTS = {
  OWNER_ROLE: 'owner',
  OWNER_BYPASS: true,
};
