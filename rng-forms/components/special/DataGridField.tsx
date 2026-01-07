'use client';

import { ActionIcon, Button, Group, Stack, Table, Text, TextInput } from '@mantine/core';

import { IconCheck, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { DataGridItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

interface Row {
  id: string;
  [key: string]: any;
}

export default function DataGridField<TValues extends FieldValues>(
  props: DataGridItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, columns, editable = false, error } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const data: Row[] = Array.isArray(field.value) ? field.value : [];
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  const handleAddRow = () => {
    const newRow: Row = {
      id: `row-${Date.now()}`,
      ...Object.fromEntries(columns.map((col) => [col.field, ''])),
    };
    field.onChange([...data, newRow]);
  };

  const handleEditStart = (row: Row) => {
    setEditingRowId(row.id);
    setEditValues(row);
  };

  const handleEditSave = () => {
    const updated = data.map((row) => (row.id === editingRowId ? editValues : row));
    field.onChange(updated);
    setEditingRowId(null);
  };

  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditValues({});
  };

  const handleDelete = (rowId: string) => {
    field.onChange(data.filter((row) => row.id !== rowId));
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text fw={600}>Data Grid</Text>
        {editable && (
          <Button size="xs" onClick={handleAddRow}>
            Add Row
          </Button>
        )}
      </Group>

      <div style={{ overflowX: 'auto' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => (
                <Table.Th key={col.field} style={{ width: col.width ? `${col.width}px` : 'auto' }}>
                  {col.header}
                </Table.Th>
              ))}
              {editable && <Table.Th style={{ width: '100px' }}>Actions</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((row) =>
              editingRowId === row.id ? (
                <Table.Tr key={row.id}>
                  {columns.map((col) => (
                    <Table.Td key={col.field}>
                      <TextInput
                        size="xs"
                        value={editValues[col.field] ?? ''}
                        onChange={(e) =>
                          setEditValues({ ...editValues, [col.field]: e.currentTarget.value })
                        }
                      />
                    </Table.Td>
                  ))}
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon size="sm" color="green" variant="subtle" onClick={handleEditSave}>
                        <IconCheck size={14} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        color="gray"
                        variant="subtle"
                        onClick={handleEditCancel}
                      >
                        ✕
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ) : (
                <Table.Tr key={row.id}>
                  {columns.map((col) => (
                    <Table.Td key={col.field}>{row[col.field]}</Table.Td>
                  ))}
                  {editable && (
                    <Table.Td>
                      <Group gap={4}>
                        <Button size="xs" variant="subtle" onClick={() => handleEditStart(row)}>
                          Edit
                        </Button>
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="subtle"
                          onClick={() => handleDelete(row.id)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  )}
                </Table.Tr>
              ),
            )}
          </Table.Tbody>
        </Table>
      </div>

      {mergedError && (
        <Text size="xs" c="red">
          {mergedError}
        </Text>
      )}
    </Stack>
  );
}
