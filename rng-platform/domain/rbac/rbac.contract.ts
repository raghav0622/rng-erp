/**
 * RBACService contract: domain-owned, law-compliant
 */

// Canonical Role Model (Phase 1)
// No logic, contracts only.

/**
 * Canonical roles for the platform.
 * - 'owner': singular, system authority
 * - 'manager': operational authority
 * - 'employee': explicit assignment only
 * - 'client': most restricted
 */
export const CANONICAL_ROLES = ['owner', 'manager', 'employee', 'client'] as const;
export type CanonicalRole = (typeof CANONICAL_ROLES)[number];
// RBAC Domain Contract
// No implementation. No runtime logic.

/**
 * Role contract covers all use cases and edge cases:
 * - Canonical fields: id, name, permissions
 * - Permissions: explicit, deterministic, no wildcards
 * - Allowed transitions:
 *   - Role assignment is explicit and atomic
 *   - No implicit or time-based changes
 *   - Roles can be created, updated, deleted explicitly
 * - Hard invariants:
 *   - Each user has exactly one role
 *   - All permissions are explicit and deterministic
 *   - No wildcards or pattern-based permissions
 *   - No orphaned roles (must always have a valid name and permissions)
 * - Forbidden states:
 *   - Multiple roles per user
 *   - Implicit permission grants
 *   - Unexplainable access
 *   - Roles with missing required fields
 * - Error expectations:
 *   - All errors are typed and explainable
 *   - No free-text errors
 *   - All edge cases (e.g., permission removal, role deletion) must be handled deterministically
 */
export interface Role {
  id: string;
  name: string;
  permissions: ReadonlyArray<string>;
}

/**
 * RBACState contract covers all use cases and edge cases:
 * - Canonical fields: userId, role, permissions
 * - Allowed transitions:
 *   - Role assignment is explicit and atomic
 *   - Permission changes are explicit and deterministic
 *   - No implicit or time-based changes
 * - Hard invariants:
 *   - Each user has exactly one role
 *   - All permissions are explicit and deterministic
 *   - No orphaned RBAC states (must always have a valid userId and role)
 * - Forbidden states:
 *   - Multiple roles per user
 *   - Implicit permission grants
 *   - Unexplainable access
 *   - RBAC states with missing required fields
 * - Error expectations:
 *   - All errors are typed and explainable
 *   - No free-text errors
 *   - All edge cases (e.g., permission removal, role reassignment) must be handled deterministically
 */
export interface RBACState {
  userId: string;
  role: string;
  permissions: ReadonlyArray<string>;
}

/**
 * Allowed transitions:
 * - Role assignment is explicit and atomic.
 * - No implicit or time-based changes.
 */

/**
 * Hard invariants:
 * - Each user has exactly one role.
 * - All permissions are explicit and deterministic.
 * - No wildcards or pattern-based permissions.
 */

/**
 * Forbidden states:
 * - Multiple roles per user
 * - Implicit permission grants
 * - Unexplainable access
 */

/**
 * Error expectations:
 * - All errors are typed and explainable.
 * - No free-text errors.
 */
