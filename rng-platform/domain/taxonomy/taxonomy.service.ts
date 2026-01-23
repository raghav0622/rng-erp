import type { TaxonomyCategory } from './taxonomy.contract';
// Taxonomy Domain Service Interface
export interface TaxonomyService {
  createCategory(params: { name: string; parentId?: string }): Promise<void>;
  getCategory(id: string): Promise<TaxonomyCategory>;
  listCategories(): Promise<TaxonomyCategory[]>;
}
