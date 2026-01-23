// Taxonomy Domain Service Implementation
import { TaxonomyCategory } from './taxonomy.contract';
import type { TaxonomyService } from './taxonomy.service';

export class TaxonomyServiceImpl implements TaxonomyService {
  async createCategory(params: { name: string; parentId?: string }): Promise<void> {
    /* ... */
  }
  async getCategory(id: string): Promise<TaxonomyCategory> {
    /* ... */ return {} as TaxonomyCategory;
  }
  async listCategories(): Promise<TaxonomyCategory[]> {
    /* ... */ return [];
  }
}
