'use client';

import { useTaxonomyDashboard } from './hooks/useTaxonomyDashboard';
import { TaxonomyDashboardView } from './ui-components/TaxonomyDashboardView';

export function TaxonomyDashboardScreen() {
  const { taxonomies, isLoading, deletingValue, handleDeleteValue } = useTaxonomyDashboard();

  return (
    <TaxonomyDashboardView
      taxonomies={taxonomies}
      isLoading={isLoading}
      deletingValue={deletingValue}
      onDeleteValue={handleDeleteValue}
    />
  );
}
