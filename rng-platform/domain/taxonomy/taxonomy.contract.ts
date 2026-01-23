// Taxonomy Domain Contract
export interface TaxonomyCategory {
  id: string;
  name: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
