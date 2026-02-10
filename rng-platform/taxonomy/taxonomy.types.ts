import type { BaseEntity } from 'rng-repository';

export interface Taxonomy extends BaseEntity {
  name: string;
  values: string[];
}

export interface ITaxonomyService {
  internalOnly_initiateTaxonomy(name: string): Promise<Taxonomy>;
  getTaxonomyByName(name: string): Promise<Taxonomy>;
  getTaxonomyByNameOptional(name: string): Promise<Taxonomy | null>;
  getTaxonomyById(id: string): Promise<Taxonomy>;
  updateTaxonomyValues(id: string, values?: string[]): Promise<Taxonomy>;
  deleteTaxonomy(id: string): Promise<void>;
  listTaxonomies(): Promise<Taxonomy[]>;
  /** Ensure taxonomy exists and add value if not already present (learning). Normalizes value (trim). */
  addValueToTaxonomy(name: string, value: string): Promise<Taxonomy>;
}
