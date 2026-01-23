// Taxonomy Repository (rng-repository extension)
// Firestore Indexes Required:
// 1. id (immutable identifier)
// 2. parentId (hierarchy traversal)

import { AbstractClientFirestoreRepository } from 'rng-repository';
import { TaxonomyCategory } from '../../domain/taxonomy/taxonomy.contract';

export class TaxonomyRepository extends AbstractClientFirestoreRepository<TaxonomyCategory> {
  // No business logic, no invariants, no RBAC, no auth logic

  // Get category by id (indexed, deterministic)
  async getById(id: string): Promise<TaxonomyCategory | null> {
    const result = await this.find({
      where: [
        ['id', '==', id],
        ['deletedAt', '==', null],
      ],
      limit: 1,
    });
    return result.data.length ? (result.data[0] ?? null) : null;
  }

  // List categories by parentId (hierarchy traversal, indexed)
  async listByParent(parentId: string): Promise<TaxonomyCategory[]> {
    const result = await this.find({
      where: [
        ['parentId', '==', parentId],
        ['deletedAt', '==', null],
      ],
    });
    return result.data;
  }

  // Soft delete is respected by all queries (deletedAt: null)

  // Error handling: Only infrastructure-level errors may be thrown
}
