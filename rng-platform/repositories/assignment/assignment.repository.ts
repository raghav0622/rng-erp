// Assignment Repository (rng-repository extension)
// Firestore Indexes Required:
// 1. (userId, feature, action)
// 2. (userId, feature, action, scope.type)
// 3. (userId, feature, action, scope.resourceId)
// 4. (userId, feature, action, scope.docId)

import { AbstractClientFirestoreRepository } from 'rng-repository';
import type { Assignment } from '../../domain/assignment/assignment.contract';

export class AssignmentRepository extends AbstractClientFirestoreRepository<Assignment> {
  // No business logic, no invariants, no RBAC, no auth logic

  // Get assignment by user, feature, action, and scope (indexed, deterministic)
  async getByUserFeatureActionScope(params: {
    userId: string;
    feature: string;
    action: string;
    scopeType?: string;
    resourceId?: string;
    docId?: string;
  }): Promise<Assignment[]> {
    const where: [string, '==', any][] = [
      ['userId', '==', params.userId],
      ['feature', '==', params.feature],
      ['action', '==', params.action],
      ['deletedAt', '==', null],
    ];
    if (params.scopeType) where.push(['scope.type', '==', params.scopeType]);
    if (params.resourceId) where.push(['scope.resourceId', '==', params.resourceId]);
    if (params.docId) where.push(['scope.docId', '==', params.docId]);
    const result = await this.find({ where });
    return result.data;
  }

  // List assignments by user (indexed, deterministic)
  async listByUser(userId: string): Promise<Assignment[]> {
    const result = await this.find({
      where: [
        ['userId', '==', userId],
        ['deletedAt', '==', null],
      ],
    });
    return result.data;
  }

  // List assignments by feature (indexed, deterministic)
  async listByFeature(feature: string): Promise<Assignment[]> {
    const result = await this.find({
      where: [
        ['feature', '==', feature],
        ['deletedAt', '==', null],
      ],
    });
    return result.data;
  }

  // Soft delete is respected by all queries (deletedAt: null)

  // Error handling: Only infrastructure-level errors may be thrown
}
