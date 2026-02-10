'use client';

import type { Taxonomy } from '@/rng-platform';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconRefresh, IconTrash, IconX } from '@tabler/icons-react';
import { RNGConfirmationModal, RNGPageContent, RNGMessageAlert } from '@/rng-ui/ux';
import { useCallback, useMemo, useState } from 'react';

export interface TaxonomyDashboardViewProps {
  taxonomies: Taxonomy[];
  isLoading: boolean;
  createName: string;
  setCreateName: (v: string) => void;
  isCreateOpen: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  onCreate: () => void;
  onUpdateValues: (id: string, values: string[]) => void;
  onDelete: (id: string) => void;
  isCreating: boolean;
  editingId: string | null;
  deletingId: string | null;
  onRefresh: () => void;
}

export function TaxonomyDashboardView({
  taxonomies,
  isLoading,
  createName,
  setCreateName,
  isCreateOpen,
  openCreateModal,
  closeCreateModal,
  onCreate,
  onUpdateValues,
  onDelete,
  isCreating,
  editingId,
  deletingId,
  onRefresh,
}: TaxonomyDashboardViewProps) {
  const [valuesModalOpen, setValuesModalOpen] = useState(false);
  const [activeTaxonomyId, setActiveTaxonomyId] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<string[]>([]);
  const [newValue, setNewValue] = useState('');

  const activeTaxonomy = useMemo(
    () => taxonomies.find((t) => t.id === activeTaxonomyId) ?? null,
    [taxonomies, activeTaxonomyId],
  );

  const openValuesModal = useCallback((taxonomy: Taxonomy) => {
    setActiveTaxonomyId(taxonomy.id);
    setDraftValues(Array.isArray(taxonomy.values) ? [...taxonomy.values] : []);
    setNewValue('');
    setValuesModalOpen(true);
  }, []);

  const closeValuesModal = useCallback(() => {
    setValuesModalOpen(false);
    setActiveTaxonomyId(null);
    setDraftValues([]);
    setNewValue('');
  }, []);

  const handleAddValue = useCallback(() => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    if (draftValues.includes(trimmed)) {
      setNewValue('');
      return;
    }
    setDraftValues((prev) => [...prev, trimmed]);
    setNewValue('');
  }, [newValue, draftValues]);

  const handleRemoveValue = useCallback((value: string) => {
    setDraftValues((prev) => prev.filter((v) => v !== value));
  }, []);

  const isSavingValues = Boolean(activeTaxonomyId && editingId === activeTaxonomyId);
  const maxInlineChips = 10;

  return (
    <RNGPageContent
      title="Taxonomy Management"
      description="Manage taxonomies used across the app (categories, tags, etc.)"
      actions={
        <Group gap="sm">
          <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={onRefresh}>
            Refresh
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Create taxonomy
          </Button>
        </Group>
      }
    >
      <Stack gap="md">
        <Modal
          title="Create taxonomy"
          opened={isCreateOpen}
          onClose={closeCreateModal}
          centered
          size="sm"
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Enter a unique name (e.g. categories, tags, statuses). The slug will be derived
              automatically.
            </Text>
            <TextInput
              label="Name"
              placeholder="e.g. categories"
              value={createName}
              onChange={(e) => setCreateName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreate()}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={closeCreateModal}>
                Cancel
              </Button>
              <Button onClick={onCreate} loading={isCreating} disabled={!createName.trim()}>
                Create
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          title={activeTaxonomy ? `Manage values: ${activeTaxonomy.name}` : 'Manage values'}
          opened={valuesModalOpen}
          onClose={closeValuesModal}
          centered
          size="lg"
        >
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Add or remove values, then save to persist changes.
            </Text>

            <Group align="flex-end" gap="sm">
              <TextInput
                label="New value"
                placeholder="Type a value…"
                value={newValue}
                onChange={(e) => setNewValue(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddValue();
                }}
                style={{ flex: 1 }}
                disabled={isSavingValues}
              />
              <Button onClick={handleAddValue} disabled={!newValue.trim() || isSavingValues}>
                Add
              </Button>
            </Group>

            <Paper withBorder radius="md" p="sm">
              {draftValues.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No values yet.
                </Text>
              ) : (
                <ScrollArea h={260} type="auto">
                  <Stack gap="xs">
                    {draftValues.map((v) => (
                      <Group key={v} justify="space-between" wrap="nowrap">
                        <Text size="sm" style={{ wordBreak: 'break-word' }}>
                          {v}
                        </Text>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleRemoveValue(v)}
                          disabled={isSavingValues}
                          aria-label={`Remove ${v}`}
                        >
                          <IconX size={16} />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                </ScrollArea>
              )}
            </Paper>

            <Group justify="flex-end" gap="sm">
              <Button variant="subtle" onClick={closeValuesModal} disabled={isSavingValues}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (!activeTaxonomyId) return;
                  onUpdateValues(activeTaxonomyId, draftValues);
                }}
                loading={isSavingValues}
                disabled={!activeTaxonomyId}
              >
                Save changes
              </Button>
            </Group>
          </Stack>
        </Modal>

        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="md" />
          </Group>
        ) : taxonomies.length === 0 ? (
          <RNGMessageAlert
            icon={<IconPlus size={32} />}
            tone="blue"
            title="No taxonomies yet"
            message="Create your first taxonomy to manage options for categories, tags, or other dropdowns across the app."
          />
        ) : (
          <Paper withBorder radius="md">
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Values</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {taxonomies.map((t) => (
                  <Table.Tr key={t.id}>
                    <Table.Td fw={500}>{t.name}</Table.Td>
                    <Table.Td>
                      {Array.isArray(t.values) && t.values.length > 0 ? (
                        <Group gap={6} wrap="wrap">
                          {t.values.slice(0, maxInlineChips).map((v) => (
                            <Badge key={v} variant="light" size="sm" radius="sm">
                              {v}
                            </Badge>
                          ))}
                          {t.values.length > maxInlineChips && (
                            <Badge variant="default" size="sm" radius="sm">
                              +{t.values.length - maxInlineChips} more
                            </Badge>
                          )}
                        </Group>
                      ) : (
                        <Badge variant="light" size="sm" radius="sm" c="dimmed">
                          No values
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group justify="flex-end" gap="xs">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => openValuesModal(t)}
                          loading={editingId === t.id}
                          disabled={deletingId !== null}
                        >
                          Manage values
                        </Button>

                      <RNGConfirmationModal
                        title="Delete taxonomy"
                        renderTrigger={({ onClick }) => (
                          <Button
                            size="xs"
                            variant="subtle"
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={onClick}
                            loading={deletingId === t.id}
                            disabled={editingId !== null}
                          >
                            Delete
                          </Button>
                        )}
                      >
                        {(onClose) => (
                          <Stack gap="md">
                            <Text size="sm" c="dimmed">
                              Delete &quot;{t.name}&quot; and all {t.values?.length ?? 0} value
                              {t.values?.length !== 1 ? 's' : ''}? This cannot be undone.
                            </Text>
                            <Group justify="flex-end" gap="sm">
                              <Button variant="subtle" onClick={onClose}>
                                Cancel
                              </Button>
                              <Button
                                color="red"
                                onClick={() => {
                                  onDelete(t.id);
                                  onClose();
                                }}
                              >
                                Delete
                              </Button>
                            </Group>
                          </Stack>
                        )}
                      </RNGConfirmationModal>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>
    </RNGPageContent>
  );
}
