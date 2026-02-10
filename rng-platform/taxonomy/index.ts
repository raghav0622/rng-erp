/**
 * Taxonomy module: CRUD and React Query hooks for Taxonomy entities.
 * Document ID = slug(name) for O(1) get-by-name. No history, no soft delete.
 *
 * UI should use hooks; getTaxonomyService is for advanced or server use.
 */

export { ClientTaxonomyService } from './ClientTaxonomyService';
export type { ClientTaxonomyServiceConfig } from './ClientTaxonomyService';
export { getTaxonomyService } from './getTaxonomyService';
export { slug } from './slug';
export type { ITaxonomyService, Taxonomy } from './taxonomy.types';

// Hooks (primary API for UI)
export {
  taxonomyQueryKeys,
  useAddTaxonomyValue,
  useDeleteTaxonomy,
  useInitiateTaxonomy,
  useListTaxonomies,
  useTaxonomyById,
  useTaxonomyByName,
  useTaxonomyOptions,
  useUpdateTaxonomyValues,
} from './hooks';
export type { TaxonomyOption } from './hooks';
