// Fallback: extend AuthState inline for repository compliance
type AuthStateRepo = AuthState & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};
// Auth Repository (rng-repository extension)
// Firestore Indexes Required:
// 1. userId (session lookup)
// 2. status
// 3. epoch

import { AbstractClientFirestoreRepository, BaseEntity } from 'rng-repository';
import type { AuthState } from '../../domain/auth/auth.contract';

export class AuthRepository extends AbstractClientFirestoreRepository<AuthStateRepo> {
  // No business logic, no invariants, no RBAC, no auth logic

  // Get auth state by userId (indexed, deterministic)
  async getByUserId(userId: string): Promise<(AuthState & BaseEntity) | null> {
    const result = await this.find({
      where: [
        ['userId', '==', userId],
        ['deletedAt', '==', null],
      ],
      limit: 1,
    });
    return result.data.length ? (result.data[0] ?? null) : null;
  }

  // Query by status (indexed, deterministic)
  async listByStatus(status: string): Promise<(AuthState & BaseEntity)[]> {
    const result = await this.find({
      where: [
        ['status', '==', status],
        ['deletedAt', '==', null],
      ],
    });
    return result.data;
  }

  // Query by epoch (indexed, deterministic)
  async listByEpoch(epoch: number): Promise<(AuthState & BaseEntity)[]> {
    const result = await this.find({
      where: [
        ['epoch', '==', epoch],
        ['deletedAt', '==', null],
      ],
    });
    return result.data;
  }

  // Soft delete is respected by all queries (deletedAt: null)

  // Error handling: Only infrastructure-level errors may be thrown
}
