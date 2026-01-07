import { Accordion, Box, SimpleGrid, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import { type FieldValues } from 'react-hook-form';
import FieldWrapper from '../../core/FieldWrapper';
import type { RNGFormItem, SectionItem } from '../../types/core';

export default function SectionLayout<TValues extends FieldValues>(
  props: SectionItem<TValues> | { item: SectionItem<TValues> },
) {
  // Handle both direct props and wrapped item prop
  const item =
    'item' in props && typeof props.item === 'object'
      ? props.item
      : (props as SectionItem<TValues>);

  const content = useMemo(
    () => (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {item.children.map((child: RNGFormItem<any>, idx: number) => (
          <FieldWrapper key={`${item.title}-${idx}`} item={child} />
        ))}
      </SimpleGrid>
    ),
    [item.children, item.title],
  );

  if (item.collapsible) {
    return (
      <Accordion defaultValue={item.defaultOpened ? item.title : ''}>
        <Accordion.Item key={item.title} value={item.title}>
          <Accordion.Control>
            <Stack gap={0}>
              <Text fw={600} size="md">
                {item.title}
              </Text>
              {item.description && (
                <Text size="sm" c="dimmed">
                  {item.description}
                </Text>
              )}
            </Stack>
          </Accordion.Control>
          <Accordion.Panel>{content}</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );
  }

  return (
    <Box>
      <Stack gap="sm" mb="md">
        <Text fw={600} size="md">
          {item.title}
        </Text>
        {item.description && (
          <Text size="sm" c="dimmed">
            {item.description}
          </Text>
        )}
      </Stack>
      {content}
    </Box>
  );
}
