// User Repository (rng-repository extension)
// Firestore Indexes Required:
// 1. email (unique lookup)
// 2. status
// 3. role

import { AbstractClientFirestoreRepository } from 'rng-repository';
import type { User } from '../../domain/user/user.contract';

export class UserRepository extends AbstractClientFirestoreRepository<User> {
  // No business logic, no invariants, no RBAC, no auth logic

  // Get user by email (indexed, deterministic)
  async getByEmail(email: string): Promise<User | null> {
    const result = await this.find({
      where: [
        ['email', '==', email],
        ['deletedAt', '==', null],
      ],
      limit: 1,
    });
    return result.items.length ? result.items[0] : null;
  }

  // List users by role (indexed, deterministic)
  async listByRole(role: string): Promise<User[]> {
    const result = await this.find({
      where: [
        ['role', '==', role],
        ['deletedAt', '==', null],
      ],
    });
    return result.items;
  }

  // Count users (deterministic)
  async countUsers(): Promise<number> {
    const result = await this.find({
      where: [['deletedAt', '==', null]],
    });
    return result.items.length;
  }

  // Soft delete is respected by all queries (deletedAt: null)

  // Error handling: Only infrastructure-level errors may be thrown
}
