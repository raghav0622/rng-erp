// Project-wide taxonomy domain stub for path alias resolution
export type TaxonomyEntity = {
  id: string;
  type: string;
  name: string;
  value: string;
  label: string;
  description?: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
};

// Patch: mimic react-query mutation object for createTaxonomy
export function useCreateTaxonomy() {
  // Return an object with mutateAsync for compatibility
  return {
    mutateAsync: async (taxonomy: Partial<TaxonomyEntity>) => {
      return {
        ...taxonomy,
        id: 'stub',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as TaxonomyEntity;
    },
  };
}

// Patch: accept an optional second argument for compatibility
export function useGetTaxonomyByType(type: string, _opts?: any) {
  // Return an object with data, isLoading, and refetch for compatibility
  return {
    data: [] as TaxonomyEntity[],
    isLoading: false,
    refetch: () => Promise.resolve([]),
  };
}
