'use client';

import {
  useDeleteTaxonomy,
  useInitiateTaxonomy,
  useListTaxonomies,
  useUpdateTaxonomyValues,
} from '@/rng-platform';
import { useCallback, useState } from 'react';
import { useRNGNotification } from '@/rng-ui/ux';

export function useTaxonomyDashboard() {
  const { data: taxonomies = [], isLoading, refetch } = useListTaxonomies();
  const initiate = useInitiateTaxonomy();
  const updateValues = useUpdateTaxonomyValues();
  const remove = useDeleteTaxonomy();
  const notifications = useRNGNotification();
  const [createName, setCreateName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    const name = createName.trim();
    if (!name) {
      notifications.showError('Enter a taxonomy name', 'Validation');
      return;
    }
    initiate.mutate(name, {
      onSuccess: (taxonomy) => {
        notifications.showSuccess(`"${taxonomy.name}" created`, 'Taxonomy created');
        setCreateName('');
        setIsCreateOpen(false);
      },
      onError: (err) => {
        notifications.showError(err instanceof Error ? err.message : 'Failed to create taxonomy');
      },
    });
  }, [createName, initiate, notifications]);

  const handleUpdateValues = useCallback(
    (id: string, values: string[]) => {
      setEditingId(id);
      updateValues.mutate(
        { id, values },
        {
          onSuccess: (taxonomy) => {
            notifications.showSuccess(`"${taxonomy.name}" updated`, 'Taxonomy updated');
            setEditingId(null);
          },
          onError: (err) => {
            notifications.showError(err instanceof Error ? err.message : 'Failed to update taxonomy');
            setEditingId(null);
          },
        },
      );
    },
    [updateValues, notifications],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setDeletingId(id);
      remove.mutate(id, {
        onSuccess: () => {
          notifications.showSuccess('Taxonomy deleted');
          setDeletingId(null);
        },
        onError: (err) => {
          notifications.showError(err instanceof Error ? err.message : 'Failed to delete taxonomy');
          setDeletingId(null);
        },
      });
    },
    [remove, notifications],
  );

  const openCreateModal = useCallback(() => {
    setCreateName('');
    setIsCreateOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateOpen(false);
    setCreateName('');
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
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
    isCreating: initiate.isPending,
    editingId,
    deletingId,
  };
}
