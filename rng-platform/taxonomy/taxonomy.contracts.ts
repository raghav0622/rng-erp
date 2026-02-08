import { BaseEntity } from '@/rng-repository';

export interface Taxonomy extends BaseEntity {
  name: string;
  values: string[]; // unique within parent
}

export interface ITaxonomyService {
  getTaxonomy(parent: string): Promise<string[]>;
  createTaxonomy(parent: string, value: string): Promise<string>;
  deleteValue(parentName: string, value: string): Promise<void>;
}
