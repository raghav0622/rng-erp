'use client';

import { Card, Stack, Text } from '@mantine/core';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { GeoInputItem } from '../../types/core';

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
}

export default function MapField<TValues extends FieldValues>(
  props: GeoInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const { control, name, label, description, error } = props;
  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      role="region"
      aria-label={label || name}
      aria-invalid={!!mergedError}
    >
      <Stack gap={6}>
        {label && (
          <Text fw={600} size="sm">
            {label}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          Map integration placeholder. Update the value programmatically with lat/lng.
        </Text>
        <Text size="sm" aria-label="Latitude">
          Lat: {(field.value as any)?.lat ?? '—'}
        </Text>
        <Text size="sm" aria-label="Longitude">
          Lng: {(field.value as any)?.lng ?? '—'}
        </Text>
        {description && (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        )}
        {mergedError && (
          <Text size="xs" c="red" role="alert">
            {mergedError}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
