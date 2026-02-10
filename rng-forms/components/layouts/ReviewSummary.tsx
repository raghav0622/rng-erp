'use client';

import { Stack, Text } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import type { ReviewSummaryItem } from '../../types/core';

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.every((v) => typeof v === 'string' || typeof v === 'number')
      ? value.join(', ')
      : value.map(formatValue).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ReviewSummaryField<TValues extends Record<string, unknown>>(
  props: ReviewSummaryItem<TValues> & { control?: any; error?: string },
) {
  const { title, fields } = props;
  const form = useFormContext<TValues>();
  const values = form.getValues();

  const getByPath = (obj: any, path: string): unknown => {
    const parts = path.split('.');
    let current: any = obj;
    for (const p of parts) {
      if (current == null) return undefined;
      current = current[p];
    }
    return current;
  };

  return (
    <Stack gap="sm">
      {title && (
        <Text size="md" fw={600}>
          {title}
        </Text>
      )}
      <Stack gap="xs">
        {fields.map(({ path, label }) => {
          const pathStr = typeof path === 'string' ? path : String(path);
          const value = getByPath(values, pathStr);
          return (
            <Stack key={pathStr} gap={2}>
              <Text size="sm" c="dimmed" fw={500}>
                {label}
              </Text>
              <Text size="sm">{formatValue(value)}</Text>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}

export default ReviewSummaryField;
