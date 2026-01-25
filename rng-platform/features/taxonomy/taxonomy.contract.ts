export type TaxonomyOption = {
  value: string;
  description?: string;
  usedByOtherEntites?: boolean;
  usedCount: number;
};
import { BaseEntity, BaseEntitySchema, PaginatedResult } from '@/rng-repository';
import z from 'zod';

export interface Taxonomy extends BaseEntity {
  name: string;
  description?: string;
  values: {
    value: string;
    description?: string;
    usedByOtherEntites?: boolean;
    usedCount: number;
  }[];
}

export const TaxonomySchema = z.object({
  ...BaseEntitySchema,
  name: z.string(),
  description: z.string().optional(),
  values: z
    .array(
      z.object({
        value: z.string(),
        description: z.string().optional(),
        usedByOtherEntites: z.boolean().optional(),
        usedCount: z.number(),
      }),
    )
    .optional(),
});

export interface ITaxonomyService {
  listAllTaxonomies(): Promise<PaginatedResult<Taxonomy>>;

  createTaxonomy(name: string, description?: string): Promise<Taxonomy>;
  getTaxonmy(name: string): Promise<Taxonomy | null>;
  updateTaxonomy(id: string, newDescription: string): Promise<Taxonomy>;

  bulkAddTaxonomyOptions(
    parentName: string,
    values: Pick<TaxonomyOption, 'value' | 'description'>[],
  ): Promise<Taxonomy>;
  bulkDeleteTaxonomyOptions(taxonomyIds: string[]): Promise<Taxonomy>;

  addTaxonomyOption(
    args: Omit<TaxonomyOption, 'usedByOtherEntites' | 'usedCount'>,
  ): Promise<Taxonomy>;

  deleteTaxonomyOption(taxonomyId: string): Promise<Taxonomy>;

  updateTaxonomyOption(
    taxonomyId: string,
    newValue: string,
    newDescription: string,
  ): Promise<Taxonomy>;

  setTaxonomyUsage(taxonomyId: string): Promise<void>;
  getTaxonomyUsageCount(taxonomyId: string): Promise<TaxonomyOption>;
}
