'use client';

import { useTaxonomyDashboard } from './hooks/useTaxonomyDashboard';
import { TaxonomyDashboardView } from './ui-components/TaxonomyDashboardView';

export function TaxonomyDashboardScreen() {
  const {
    taxonomies,
    isLoading,
    createName,
    setCreateName,
    isCreateOpen,
    openCreateModal,
    closeCreateModal,
    handleCreate,
    handleUpdateValues,
    handleDelete,
    handleRefresh,
    isCreating,
    editingId,
    deletingId,
  } = useTaxonomyDashboard();

  return (
    <TaxonomyDashboardView
      taxonomies={taxonomies}
      isLoading={isLoading}
      createName={createName}
      setCreateName={setCreateName}
      isCreateOpen={isCreateOpen}
      openCreateModal={openCreateModal}
      closeCreateModal={closeCreateModal}
      onCreate={handleCreate}
      onUpdateValues={handleUpdateValues}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      isCreating={isCreating}
      editingId={editingId}
      deletingId={deletingId}
    />
  );
}
