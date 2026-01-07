import { SimpleGrid } from '@mantine/core';
import { useMemo } from 'react';
import { type FieldValues } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { GroupItem, RNGFormItem } from '../../types/core';

export default function GroupLayout<TValues extends FieldValues>(
  props: GroupItem<TValues> | { item: GroupItem<TValues> },
) {
  // Handle both direct props and wrapped item prop
  const item =
    'item' in props && typeof props.item === 'object' ? props.item : (props as GroupItem<TValues>);

  const content = useMemo(
    () => (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {item.children.map((child: RNGFormItem<any>, idx: number) => (
          <FieldWrapper key={`group-${idx}`} item={child} />
        ))}
      </SimpleGrid>
    ),
    [item.children],
  );

  return content;
}
