'use client';

import { useAllCategories, useDeleteTaxonomyValue } from '@/rng-platform/taxonomy';
import { taxonomyService } from '@/rng-platform/taxonomy/taxonomy.service';
import { useCallback, useEffect, useState } from 'react';

export interface TaxonomyCategory {
  name: string;
  values: string[];
}

export function useTaxonomyDashboard() {
  const [deletingValue, setDeletingValue] = useState<string | null>(null);
  const [taxonomies, setTaxonomies] = useState<TaxonomyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: categories = [] } = useAllCategories();
  const deleteMutation = useDeleteTaxonomyValue();

  const fetchAllTaxonomies = useCallback(async () => {
    if (categories.length === 0) {
      setTaxonomies([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const results = await Promise.all(
        categories.map(async (category) => ({
          name: category,
          values: await taxonomyService.getTaxonomy(category),
        })),
      );
      setTaxonomies(results.filter((t) => t.values.length > 0));
    } catch (error) {
      console.error('Failed to fetch taxonomies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [categories]);

  // Fetch on mount and when categories change
  useEffect(() => {
    fetchAllTaxonomies();
  }, [fetchAllTaxonomies]);

  // Listen for taxonomy updates - use direct fetch to avoid stale closure
  useEffect(() => {
    const handleUpdate = async () => {
      if (categories.length === 0) {
        setTaxonomies([]);
        return;
      }

      try {
        const results = await Promise.all(
          categories.map(async (category) => ({
            name: category,
            values: await taxonomyService.getTaxonomy(category),
          })),
        );
        setTaxonomies(results.filter((t) => t.values.length > 0));
      } catch (error) {
        console.error('Failed to fetch taxonomies on update:', error);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('taxonomy-update', handleUpdate);
      return () => window.removeEventListener('taxonomy-update', handleUpdate);
    }

    return () => {}; // Return empty cleanup for SSR
  }, [categories]); // Depend on categories directly, not the callback

  const handleDeleteValue = async (parent: string, value: string) => {
    setDeletingValue(`${parent}:${value}`);
    try {
      await deleteMutation.mutateAsync({ parent, value });
      // Event will trigger auto-refresh
    } catch (error) {
      console.error('Failed to delete taxonomy value:', error);
    } finally {
      setDeletingValue(null);
    }
  };

  return {
    taxonomies,
    isLoading,
    deletingValue,
    handleDeleteValue,
  };
}
