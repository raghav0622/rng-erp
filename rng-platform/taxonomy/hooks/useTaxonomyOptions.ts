'use client';

import { useMemo } from 'react';
import { useTaxonomyByNameOptional } from './useTaxonomyQueries';

export interface TaxonomyOption {
  value: string;
  label: string;
}

/**
 * Returns options suitable for Mantine Select/Autocomplete from a taxonomy by name.
 * When taxonomy does not exist yet (first use), returns empty options and no error.
 * Used by TaxonomyInput so new taxonomies learn on first value entered.
 *
 * @param name - Taxonomy name (e.g. 'categories', 'job_type')
 * @returns { options, isLoading, error } — options are derived from taxonomy.values
 */
export function useTaxonomyOptions(name: string | null | undefined): {
  options: TaxonomyOption[];
  isLoading: boolean;
  error: Error | null;
} {
  const { data: taxonomy, isLoading, error } = useTaxonomyByNameOptional(name);

  const options = useMemo((): TaxonomyOption[] => {
    if (!taxonomy?.values) return [];
    return taxonomy.values.map((v) => ({ value: v, label: v }));
  }, [taxonomy?.values]);

  return {
    options,
    isLoading,
    error: error ?? null,
  };
}
