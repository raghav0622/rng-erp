// RBACService orchestrator for kernel (Phase 2)
import type { RBACDecision, RBACInput } from './rbac.types';

export interface RBACService {
  check(input: RBACInput): Promise<RBACDecision>;
}

// Example stub for orchestration logic (no implementation in Phase 2)
// Implementation must:
// - Load role permissions from RoleRepository
// - Load assignment from AssignmentRepository
// - Call evaluateRBAC
// - Throw RBACMisconfigurationError if role config missing
// - Throw RBACForbiddenError if denied
