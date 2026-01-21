// Pure RBAC engine for kernel (finalized)
// Feature registry access forbidden in pure RBAC engine
import { RBACDenialReason } from './rbac.reasons';
import {
  Assignment,
  RBACAllowReason,
  RBACDecision,
  RBACInput,
  RolePermissions,
} from './rbac.types';

/**
 * evaluateRBAC is a pure, deterministic function that makes RBAC decisions.
 *
 * Evaluation Order (LAW):
 * 1. Owner → allow (bypass)
 * 2. Manager → allow if rolePermissions permit (never owner-only)
 * 3. Employee → allow ONLY if assignment exists (never owner-only, never escalated)
 * 4. Client → deny (CLIENT_RESTRICTED)
 * 5. Else → deny
 *
 * All denial reasons are finite and explicit.
 */
export function evaluateRBAC(
  input: RBACInput,
  rolePermissions: RolePermissions | null,
  assignment: Assignment | null,
): RBACDecision {
  // 1. Owner bypass
  if (input.role === 'owner') {
    return { allowed: true, reason: RBACAllowReason.OWNER_BYPASS };
  }

  // 2. Feature/action registry enforcement is now handled in the service layer

  // 3. Client restrictions
  if (input.role === 'client') {
    return { allowed: false, reason: RBACDenialReason.CLIENT_RESTRICTED };
  }

  // 4. Manager: allow if rolePermissions permit
  if (input.role === 'manager') {
    if (rolePermissions && rolePermissions.actions.includes(input.action)) {
      return { allowed: true, reason: RBACAllowReason.ROLE_ALLOWED };
    }
    return { allowed: false, reason: RBACDenialReason.ROLE_FORBIDDEN };
  }

  // 5. Employee: allow ONLY if assignment exists and does not escalate beyond role ceiling
  if (input.role === 'employee') {
    if (assignment && assignment.action === input.action && assignment.feature === input.feature) {
      if (rolePermissions && rolePermissions.actions.includes(input.action)) {
        return { allowed: true, reason: RBACAllowReason.ASSIGNMENT_ALLOWED };
      } else {
        // Assignment would escalate beyond role ceiling
        return { allowed: false, reason: RBACDenialReason.ASSIGNMENT_ESCALATION };
      }
    }
    return { allowed: false, reason: RBACDenialReason.ASSIGNMENT_MISSING };
  }

  // 6. Fallback: deny
  return { allowed: false, reason: RBACDenialReason.ROLE_FORBIDDEN };
}
