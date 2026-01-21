// Taxonomy domain types and hooks (stub for build)

export type TaxonomyEntity = {
  id: string;
  type: string;
  name: string;
  description?: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function useCreateTaxonomy() {
  // Stub: returns a no-op function
  return async (taxonomy: Partial<TaxonomyEntity>) => {
    return {
      ...taxonomy,
      id: 'stub',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as TaxonomyEntity;
  };
}

export function useGetTaxonomyByType(type: string) {
  // Stub: returns an empty array
  return [] as TaxonomyEntity[];
}
