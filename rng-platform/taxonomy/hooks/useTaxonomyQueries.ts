'use client';

import { useQuery } from '@tanstack/react-query';
import { getTaxonomyService } from '../getTaxonomyService';
import { taxonomyQueryKeys } from './keys';

/**
 * Query hook: fetch taxonomy by name (slug).
 * Uses useQuery so callers can use isLoading / error without Suspense.
 */
export function useTaxonomyByName(name: string | null | undefined) {
  const svc = getTaxonomyService();
  return useQuery({
    queryKey: taxonomyQueryKeys.detailByName(name ?? ''),
    queryFn: () => svc.getTaxonomyByName(name!),
    enabled: Boolean(name?.trim()),
  });
}

/**
 * Query hook: fetch taxonomy by name; returns null when not found (no error).
 * Used by TaxonomyInput so first use shows empty options instead of error.
 */
export function useTaxonomyByNameOptional(name: string | null | undefined) {
  const svc = getTaxonomyService();
  return useQuery({
    queryKey: taxonomyQueryKeys.detailByName(name ?? ''),
    queryFn: async () => {
      // #region agent log
      const key = taxonomyQueryKeys.detailByName(name ?? '');
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'useTaxonomyQueries.ts:queryFn',
            message: 'getTaxonomyByNameOptional called',
            data: { name: name ?? '', queryKey: key },
            timestamp: Date.now(),
            hypothesisId: 'A',
          }),
        }).catch(() => {});
      }
      // #endregion
      try {
        const result = await svc.getTaxonomyByNameOptional(name!);
        // #region agent log
        if (typeof fetch !== 'undefined') {
          fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'useTaxonomyQueries.ts:queryFnResult',
              message: 'getTaxonomyByNameOptional result',
              data: {
                found: !!result,
                valuesLength: result?.values?.length ?? 0,
                id: result?.id ?? null,
              },
              timestamp: Date.now(),
              hypothesisId: 'B',
            }),
          }).catch(() => {});
        }
        // #endregion
        return result;
      } catch (err) {
        // #region agent log
        if (typeof fetch !== 'undefined') {
          fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'useTaxonomyQueries.ts:queryFnError',
              message: 'getTaxonomyByNameOptional error',
              data: {
                errorMessage: err instanceof Error ? err.message : String(err),
                errorCode: (err as { code?: string })?.code ?? null,
              },
              timestamp: Date.now(),
              hypothesisId: 'F',
            }),
          }).catch(() => {});
        }
        // #endregion
        throw err;
      }
    },
    enabled: Boolean(name?.trim()),
  });
}

/**
 * Query hook: fetch taxonomy by document id.
 */
export function useTaxonomyById(id: string | null | undefined) {
  const svc = getTaxonomyService();
  return useQuery({
    queryKey: taxonomyQueryKeys.detailById(id ?? ''),
    queryFn: () => svc.getTaxonomyById(id!),
    enabled: Boolean(id?.trim()),
  });
}

/**
 * Query hook: list all taxonomies (ordered by name).
 */
export function useListTaxonomies() {
  const svc = getTaxonomyService();
  return useQuery({
    queryKey: taxonomyQueryKeys.list(),
    queryFn: () => svc.listTaxonomies(),
  });
}
