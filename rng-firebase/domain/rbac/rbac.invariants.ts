// RBAC invariants and documentation for Phase 2

/**
 * RBAC INVARIANTS (MANDATORY)
 *
 * - Every RBAC decision has a reason (see rbac.reasons.ts)
 * - Owner bypass cannot be disabled
 * - Missing role config is a hard error (RBACMisconfigurationError)
 * - Assignments cannot grant owner-only actions (RBACForbiddenError)
 * - Assignment escalation beyond role is forbidden
 * - Wildcards in actions are forbidden
 * - Unknown actions must be denied (reason: ACTION_UNKNOWN)
 * - Violations MUST throw
 */

export const RBAC_INVARIANTS = {
  OWNER_ROLE: 'owner',
  OWNER_BYPASS: true,
  OWNER_ONLY_ACTIONS: ['system_admin', 'kernel_config'],
  ASSIGNMENT_ESCALATION_FORBIDDEN: true,
  ROLE_MISCONFIG_HARD_ERROR: true,
  WILDCARDS_FORBIDDEN: true,
  UNKNOWN_ACTION_DENY: true,
};
