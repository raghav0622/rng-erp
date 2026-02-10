'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getTaxonomyService } from '../getTaxonomyService';
import { taxonomyQueryKeys } from './keys';

/**
 * Mutation hook: update taxonomy values.
 * Invalidates list and detail (by id and by name).
 */
export function useUpdateTaxonomyValues() {
  const queryClient = useQueryClient();
  const svc = getTaxonomyService();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values?: string[] }) =>
      svc.updateTaxonomyValues(id, values),
    onSuccess: (taxonomy) => {
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.detailById(taxonomy.id) });
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.detailByName(taxonomy.name) });
    },
  });
}

/**
 * Mutation hook: delete taxonomy by id.
 */
export function useDeleteTaxonomy() {
  const queryClient = useQueryClient();
  const svc = getTaxonomyService();

  return useMutation({
    mutationFn: (id: string) => svc.deleteTaxonomy(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.details() });
    },
  });
}

/**
 * Mutation hook: idempotent create taxonomy by name (internal / admin use).
 * Use when you need to ensure a taxonomy exists before using it.
 */
export function useInitiateTaxonomy() {
  const queryClient = useQueryClient();
  const svc = getTaxonomyService();

  return useMutation({
    mutationFn: (name: string) => svc.internalOnly_initiateTaxonomy(name),
    onSuccess: (taxonomy) => {
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.detailById(taxonomy.id) });
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.detailByName(taxonomy.name) });
    },
  });
}

/**
 * Mutation hook: add a value to a taxonomy (learning). Used by TaxonomyInput only.
 * Ensures taxonomy exists, appends value if not present, invalidates cache.
 */
export function useAddTaxonomyValue() {
  const queryClient = useQueryClient();
  const svc = getTaxonomyService();

  return useMutation({
    mutationFn: ({ name, value }: { name: string; value: string }) =>
      svc.addValueToTaxonomy(name, value),
    onSuccess: (taxonomy) => {
      // #region agent log
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useTaxonomyMutations.ts:useAddTaxonomyValue:onSuccess',
            message: 'addValue onSuccess invalidation',
            data: {
              taxonomyId: taxonomy.id,
              taxonomyName: taxonomy.name,
              invalidateKeys: ['list', 'detailById', 'detailByName'],
            },
            timestamp: Date.now(),
            hypothesisId: 'E',
          }),
        }).catch(() => {});
      }
      // #endregion
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.list() });
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.detailById(taxonomy.id) });
      queryClient.invalidateQueries({ queryKey: taxonomyQueryKeys.detailByName(taxonomy.name) });
    },
    onError: (err) => {
      // #region agent log
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useTaxonomyMutations.ts:useAddTaxonomyValue:onError',
            message: 'addValue onError',
            data: {
              errorMessage: err instanceof Error ? err.message : String(err),
              code: (err as { code?: string })?.code ?? null,
            },
            timestamp: Date.now(),
            hypothesisId: 'D',
          }),
        }).catch(() => {});
      }
      // #endregion
    },
  });
}
