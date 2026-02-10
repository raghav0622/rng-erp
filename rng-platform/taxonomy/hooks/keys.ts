/**
 * React Query cache keys for taxonomy hooks.
 * Hierarchical for efficient invalidation.
 */

export const taxonomyQueryKeys = {
  all: ['taxonomy'] as const,

  lists: () => [...taxonomyQueryKeys.all, 'list'] as const,
  list: () => [...taxonomyQueryKeys.lists(), 'all'] as const,

  details: () => [...taxonomyQueryKeys.all, 'detail'] as const,
  detailById: (id: string) => [...taxonomyQueryKeys.details(), 'id', id] as const,
  detailByName: (name: string) => [...taxonomyQueryKeys.details(), 'name', name] as const,
} as const;
