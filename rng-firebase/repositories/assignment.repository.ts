// AssignmentRepository contract for kernel (Phase 2)
// INTERNAL ONLY: Not exported from public kernel surface
import type { IRepository } from '../abstract-client-repository/types';

import type { AssignmentScope } from '../domain/assignment/contract';
import type { Assignment } from '../domain/rbac/rbac.types';

export interface AssignmentRepository extends IRepository<Assignment> {
  getByUserIdFeatureActionScope(
    userId: string,
    feature: string,
    action: string,
    scope: AssignmentScope,
  ): Promise<Assignment | null>;
  getAllByUserId(userId: string): Promise<Assignment[]>;
}
