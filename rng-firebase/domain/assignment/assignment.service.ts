// AssignmentService contract — all assignment creation must go through this interface
// Enforces all assignment invariants at the service boundary

/**
 * AssignmentService enforces all assignment invariants. Only this service may create assignments.
 * All violations MUST throw AssignmentInvariantViolationError.
 */
export interface AssignmentService {
  /**
   * Create an assignment. Throws AssignmentInvariantViolationError if:
   * - Duplicate assignment (user, feature, action, scope)
   * - Owner-only action
   * - Client assignment
   * - Escalation beyond rolePermissions
   * - Feature/action not in registry
   */
  createAssignment(input: {
    userId: string;
    feature: string;
    action: string;
    scope: import('./contract').AssignmentScope;
  }): Promise<void>;

  /**
   * Revoke an assignment. Throws AssignmentInvariantViolationError if not allowed.
   */
  revokeAssignment(id: string): Promise<void>;
}

/**
 * ENFORCEMENT RULES (MANDATORY):
 * - Enforce uniqueness (no duplicate user, feature, action, scope)
 * - Block owner-only actions (see RBAC_INVARIANTS)
 * - Block client assignments (see CLIENT_INVARIANTS)
 * - Block escalation beyond rolePermissions
 * - Only this service may create assignments
 */
