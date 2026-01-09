// AssignmentRepository contract for kernel (Phase 2)
import type { IRepository } from '../abstract-client-repository/types';
import type { Assignment } from '../domain/rbac/rbac.types';

export interface AssignmentRepository extends IRepository<Assignment> {
  getByUserIdAndFeatureAndAction(
    userId: string,
    feature: string,
    action: string,
  ): Promise<Assignment | null>;
  getAllByUserId(userId: string): Promise<Assignment[]>;
}
