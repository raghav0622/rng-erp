'use client';

import { ActionIcon, Button, Card, Grid, Group, Stack, Text } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useFieldArray, useFormContext, type FieldValues } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { ArrayFieldItem, RNGFormItem } from '../../types/core';

export default function ArrayField<TValues extends FieldValues>(
  props: ArrayFieldItem<TValues> | { item: ArrayFieldItem<TValues> },
) {
  // Handle both direct props and wrapped item prop
  const item =
    'item' in props && typeof props.item === 'object'
      ? props.item
      : (props as ArrayFieldItem<TValues>);

  const { control } = useFormContext<TValues>();
  const { fields, append, remove } = useFieldArray({ control, name: item.name as any });

  const handleAdd = () => {
    const defaultValue: any = {};
    item.itemSchema.forEach((child: RNGFormItem<any>) => {
      const childName = (child as any).name || '';
      const childDefault = (child as any).defaultValue;
      // Strip any prefix so defaults map to the item field keys (e.g., 'name', 'role')
      const finalKey = childName.includes('.')
        ? childName.split('.').pop() || childName
        : childName;
      defaultValue[finalKey] = childDefault !== undefined ? childDefault : '';
    });
    append(defaultValue);
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Text fw={600}>{item.addLabel || 'Items'}</Text>
        <Button size="xs" leftSection={<IconPlus size={14} />} variant="light" onClick={handleAdd}>
          {item.addLabel || 'Add'}
        </Button>
      </Group>

      <Stack gap="sm">
        {fields.map((field, idx) => (
          <Card key={field.id} withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start" mb="sm">
              <Text size="sm" fw={600}>
                Item {idx + 1}
              </Text>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => remove(idx)}
                disabled={item.minItems !== undefined && fields.length <= item.minItems}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>

            <Grid gutter="md">
              {item.itemSchema.map((child: RNGFormItem<any>, childIdx: number) => {
                // Ensure colProps are always set, default to full width
                const childWithColProps = {
                  ...child,
                  name: `${item.name}.${idx}.${(child as any).name}`,
                  colProps: (child as any).colProps || { span: 12 },
                };
                return (
                  <FieldWrapper key={`${field.id}-${childIdx}`} item={childWithColProps as any} />
                );
              })}
            </Grid>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
