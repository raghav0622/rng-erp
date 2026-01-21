// AssignmentRepository contract for kernel (Phase 2)
// INTERNAL ONLY: Not exported from public kernel surface
import type { IRepository } from '../abstract-client-repository/types';

import type { AssignmentScope } from '../domain/assignment/contract';
import type { Assignment } from '../domain/rbac/rbac.types';

/**
 * AssignmentRepository contract
 *
 * Invariants:
 * - Must enforce uniqueness of (userId, feature, action, scope) at the repository level
 * - Must throw RepositoryError(FAILED_PRECONDITION) if a duplicate exists on create
 * - Soft-deleted assignments must not be considered for uniqueness
 * - All queries must be deterministic and side-effect free
 */
export interface AssignmentRepository extends IRepository<Assignment> {
  getByUserIdFeatureActionScope(
    userId: string,
    feature: string,
    action: string,
    scope: AssignmentScope,
  ): Promise<Assignment | null>;
  getAllByUserId(userId: string): Promise<Assignment[]>;

  /**
   * Enforces uniqueness of (userId, feature, action, scope).
   * Must throw RepositoryError(FAILED_PRECONDITION) if a non-deleted duplicate exists.
   * @param userId
   * @param feature
   * @param action
   * @param scope
   */
  ensureAssignmentUnique(
    userId: string,
    feature: string,
    action: string,
    scope: AssignmentScope,
    excludeId?: string,
  ): Promise<void>;
}
