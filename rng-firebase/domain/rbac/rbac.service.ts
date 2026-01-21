// RBACService orchestrator for kernel (Phase 2)
import type { RBACInput } from './rbac.types';

export interface RBACService {
  /**
   * Checks RBAC access for the given input. Throws RBACForbiddenError on denial.
   * Returns void on success.
   */
  check(input: RBACInput): Promise<void>;
}

// Example stub for orchestration logic (no implementation in Phase 2)
// Implementation must:
// - Load role permissions from RoleRepository
// - Load assignment from AssignmentRepository
// - Call evaluateRBAC
// - Throw RBACMisconfigurationError if role config missing
// - Throw RBACForbiddenError if denied
