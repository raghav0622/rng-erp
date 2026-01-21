// Taxonomy domain types and repository contract (kernel)
// CONTRACT-ONLY: No implementation in kernel. All access must be via RBAC-enforced service layer.

export type TaxonomyEntity = {
  id: string;
  type: string;
  name: string;
  description?: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface TaxonomyRepository {
  create(taxonomy: Omit<TaxonomyEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaxonomyEntity>;
  getByType(type: string): Promise<TaxonomyEntity[]>;
  getById(id: string): Promise<TaxonomyEntity | null>;
  update(id: string, patch: Partial<TaxonomyEntity>): Promise<TaxonomyEntity>;
  delete(id: string): Promise<void>;
}

// All taxonomy access must be RBAC-enforced in the service layer.
