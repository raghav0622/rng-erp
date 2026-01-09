// Pure RBAC engine for kernel (finalized)
import { RBAC_ACTION_RULES } from './rbac.actions';
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
  ownerOnlyActions: string[] = [],
): RBACDecision {
  // 1. Owner bypass
  if (input.role === 'owner') {
    return { allowed: true, reason: RBACAllowReason.OWNER_BYPASS };
  }

  // 2. Action validity
  if (!input.action || typeof input.action !== 'string' || !RBAC_ACTION_RULES.caseSensitive) {
    return { allowed: false, reason: RBACDenialReason.ACTION_UNKNOWN };
  }
  if (RBAC_ACTION_RULES.allowWildcards && (input.action.includes('*') || input.action === '*')) {
    return { allowed: false, reason: RBACDenialReason.ACTION_UNKNOWN };
  }
  if (ownerOnlyActions.includes(input.action)) {
    return { allowed: false, reason: RBACDenialReason.OWNER_ONLY };
  }

  // 3. Role config
  if (!rolePermissions) {
    return { allowed: false, reason: RBACDenialReason.ROLE_MISCONFIGURED };
  }
  if (rolePermissions.feature !== input.feature) {
    return { allowed: false, reason: RBACDenialReason.FEATURE_UNKNOWN };
  }

  // 4. Client restrictions
  if (input.role === 'client') {
    return { allowed: false, reason: RBACDenialReason.CLIENT_RESTRICTED };
  }

  // 5. Manager: allow if rolePermissions permit (never owner-only)
  if (input.role === 'manager') {
    if (rolePermissions.actions.includes(input.action)) {
      if (ownerOnlyActions.includes(input.action)) {
        return { allowed: false, reason: RBACDenialReason.OWNER_ONLY };
      }
      return { allowed: true, reason: RBACAllowReason.ROLE_ALLOWED };
    }
    // Managers may not escalate beyond allowlist
    return { allowed: false, reason: RBACDenialReason.ROLE_FORBIDDEN };
  }

  // 6. Employee: allow ONLY if assignment exists (never owner-only, never escalated)
  if (input.role === 'employee') {
    if (!assignment) {
      return { allowed: false, reason: RBACDenialReason.ASSIGNMENT_MISSING };
    }
    if (assignment.action !== input.action || assignment.feature !== input.feature) {
      return { allowed: false, reason: RBACDenialReason.ASSIGNMENT_MISSING };
    }
    // Employees may not escalate beyond rolePermissions
    if (!rolePermissions.actions.includes(input.action)) {
      return { allowed: false, reason: RBACDenialReason.ASSIGNMENT_ESCALATION };
    }
    if (ownerOnlyActions.includes(input.action)) {
      return { allowed: false, reason: RBACDenialReason.OWNER_ONLY };
    }
    return { allowed: true, reason: RBACAllowReason.ASSIGNMENT_ALLOWED };
  }

  // 7. Fallback: deny
  return { allowed: false, reason: RBACDenialReason.ROLE_FORBIDDEN };
}
