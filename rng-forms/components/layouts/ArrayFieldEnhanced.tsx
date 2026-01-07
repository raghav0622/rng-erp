'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconCopy,
  IconDotsVertical,
  IconGripVertical,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useFieldArray, useFormContext, type FieldValues } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { ArrayFieldItem, RNGFormItem } from '../../types/core';

interface SortableItemProps {
  id: string;
  index: number;
  item: ArrayFieldItem<any>;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

function SortableItem({
  id,
  index,
  item,
  isSelected,
  onSelect,
  onRemove,
  onDuplicate,
  disabled,
  children,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      withBorder
      padding="md"
      radius="md"
      bg={isSelected ? 'var(--mantine-color-blue-0)' : undefined}
    >
      <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect(e.currentTarget.checked)}
            aria-label={`Select item ${index + 1}`}
          />
          <ActionIcon
            {...attributes}
            {...listeners}
            variant="subtle"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            aria-label="Drag to reorder"
          >
            <IconGripVertical size={16} />
          </ActionIcon>
          <Text size="sm" fw={600}>
            Item {index + 1}
          </Text>
        </Group>

        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" size="sm" aria-label="Item options">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconCopy size={14} />} onClick={onDuplicate}>
              Duplicate
            </Menu.Item>
            <Menu.Item
              leftSection={<IconTrash size={14} />}
              color="red"
              onClick={onRemove}
              disabled={disabled}
            >
              Remove
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Stack gap="sm">{children}</Stack>
    </Card>
  );
}

export default function ArrayFieldEnhanced<TValues extends FieldValues>(
  props: ArrayFieldItem<TValues> | { item: ArrayFieldItem<TValues> },
) {
  const item =
    'item' in props && typeof props.item === 'object'
      ? props.item
      : (props as ArrayFieldItem<TValues>);

  const { control } = useFormContext<TValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: item.name as any });

  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAdd = () => {
    const defaultValue: any = {};
    item.itemSchema.forEach((child: RNGFormItem<any>) => {
      const childName = (child as any).name || '';
      defaultValue[childName] = (child as any).defaultValue ?? null;
    });
    append(defaultValue);
  };

  const handleDuplicate = (index: number) => {
    const itemToDuplicate = fields[index];
    if (itemToDuplicate) {
      append(itemToDuplicate as any);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over.id);
      move(oldIndex, newIndex);

      // Update selected indexes after move
      if (selectedIndexes.has(oldIndex)) {
        const newSelected = new Set(selectedIndexes);
        newSelected.delete(oldIndex);
        newSelected.add(newIndex);
        setSelectedIndexes(newSelected);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedIndexes.size === fields.length) {
      setSelectedIndexes(new Set());
    } else {
      setSelectedIndexes(new Set(fields.map((_, idx) => idx)));
    }
  };

  const handleBulkDelete = () => {
    // Remove in reverse order to maintain correct indexes
    const sortedIndexes = Array.from(selectedIndexes).sort((a, b) => b - a);
    sortedIndexes.forEach((idx) => remove(idx));
    setSelectedIndexes(new Set());
  };

  const selectedCount = selectedIndexes.size;
  const allSelected = selectedCount === fields.length && fields.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < fields.length;

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Group gap="xs">
          <Text fw={600}>{item.addLabel || 'Items'}</Text>
          {fields.length > 0 && (
            <Badge variant="light" size="sm">
              {fields.length} {fields.length === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          {fields.length > 0 && (
            <>
              <Tooltip label={allSelected ? 'Deselect all' : 'Select all'}>
                <ActionIcon
                  variant="subtle"
                  onClick={handleSelectAll}
                  aria-label={allSelected ? 'Deselect all' : 'Select all'}
                >
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={handleSelectAll}
                    styles={{ input: { cursor: 'pointer' } }}
                  />
                </ActionIcon>
              </Tooltip>
              {selectedCount > 0 && (
                <Tooltip label={`Delete ${selectedCount} selected`}>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={handleBulkDelete}
                    disabled={
                      item.minItems !== undefined && fields.length - selectedCount < item.minItems
                    }
                    aria-label={`Delete ${selectedCount} selected items`}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Tooltip>
              )}
            </>
          )}
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            variant="light"
            onClick={handleAdd}
            disabled={item.maxItems !== undefined && fields.length >= item.maxItems}
          >
            {item.addLabel || 'Add'}
          </Button>
        </Group>
      </Group>

      {selectedCount > 0 && (
        <Badge variant="filled" size="lg">
          {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
        </Badge>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <Stack gap="sm">
            {fields.map((field, idx) => (
              <SortableItem
                key={field.id}
                id={field.id}
                index={idx}
                item={item}
                isSelected={selectedIndexes.has(idx)}
                onSelect={(checked) => {
                  const newSelected = new Set(selectedIndexes);
                  if (checked) {
                    newSelected.add(idx);
                  } else {
                    newSelected.delete(idx);
                  }
                  setSelectedIndexes(newSelected);
                }}
                onRemove={() => remove(idx)}
                onDuplicate={() => handleDuplicate(idx)}
                disabled={item.minItems !== undefined && fields.length <= item.minItems}
              >
                {item.itemSchema.map((child: RNGFormItem<any>, childIdx: number) => (
                  <FieldWrapper
                    key={`${field.id}-${childIdx}`}
                    item={{ ...child, name: `${item.name}.${idx}.${(child as any).name}` } as any}
                  />
                ))}
              </SortableItem>
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {fields.length === 0 && (
        <Card withBorder padding="xl" radius="md">
          <Stack align="center" gap="sm">
            <Text size="sm" c="dimmed">
              No items yet
            </Text>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={handleAdd}>
              Add first item
            </Button>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
