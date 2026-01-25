import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import type { TaxonomyOption } from './taxonomy.contract';
import { taxonomyService } from './taxonomy.service';

// Utility to ensure all taxonomy options have required fields
function normalizeTaxonomyOptions(options: Array<Partial<TaxonomyOption>>): TaxonomyOption[] {
  return options.map((opt) => ({
    value: opt.value ?? '',
    description: opt.description,
    usedByOtherEntites: opt.usedByOtherEntites,
    usedCount: typeof opt.usedCount === 'number' ? opt.usedCount : 0,
  }));
}
// Developer-friendly argument types
export interface CreateTaxonomyArgs {
  name: string;
  description?: string;
}

export interface UpdateTaxonomyArgs {
  id: string;
  newDescription: string;
}

export interface BulkAddTaxonomyOptionsArgs {
  parentName: string;
  values: Pick<TaxonomyOption, 'value' | 'description'>[];
}

export interface BulkDeleteTaxonomyOptionsArgs {
  taxonomyIds: string[];
}

export interface AddTaxonomyOptionArgs extends Omit<
  TaxonomyOption,
  'usedByOtherEntites' | 'usedCount'
> {
  taxonomyName: string;
}

export interface DeleteTaxonomyOptionArgs {
  taxonomyId: string;
}

export interface UpdateTaxonomyOptionArgs {
  taxonomyId: string;
  newValue: string;
  newDescription: string;
}

export interface SetTaxonomyUsageArgs {
  taxonomyId: string;
}

export function useListTaxonomies() {
  return useSuspenseQuery({
    queryKey: ['taxonomies'],
    queryFn: async () => await taxonomyService.listAllTaxonomies(),
  });
}

// Query: Get taxonomy by name
export function useGetTaxonomy(name: string) {
  return useSuspenseQuery({
    queryKey: ['taxonomy', name],
    queryFn: async () => await taxonomyService.getTaxonmy(name),
  });
}

// Mutation: Create taxonomy
export function useCreateTaxonomy() {
  return useMutation({
    mutationFn: async (args: CreateTaxonomyArgs) =>
      await taxonomyService.createTaxonomy(args.name, args.description),

    //
  });
}

// Mutation: Update taxonomy
