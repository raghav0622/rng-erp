import { BaseEntity } from '@/rng-repository';

export interface Taxonomy extends BaseEntity {
  name: string;
  values: string[];
}

export interface ITaxonomyService {
  internalOnly_initiateTaxonomy(name: string): Promise<Taxonomy>;
  getTaxonomyByName(name: string): Promise<Taxonomy>;
  getTaxonomyById(id: string): Promise<Taxonomy>;
  updateTaxonomyValues(id: string, values?: string[]): Promise<Taxonomy>;
  deleteTaxonomy(id: string): Promise<void>;
  listTaxonomies(): Promise<Taxonomy[]>;
}
