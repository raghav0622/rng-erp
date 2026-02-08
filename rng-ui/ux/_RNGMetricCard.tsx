'use client';

import { Paper, Stack, Text, type PaperProps, type TextProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface RNGMetricCardProps extends Omit<PaperProps, 'children'> {
  label: string;
  value: ReactNode;
  labelProps?: TextProps;
  valueProps?: TextProps;
}

export function RNGMetricCard({
  label,
  value,
  labelProps,
  valueProps,
  ...props
}: RNGMetricCardProps) {
  const renderValue =
    typeof value === 'string' || typeof value === 'number' ? (
      <Text size="xl" fw={700} {...valueProps}>
        {value}
      </Text>
    ) : (
      value
    );

  return (
    <Paper p="md" radius="md" withBorder {...props}>
      <Stack gap="xs">
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} {...labelProps}>
          {label}
        </Text>
        {renderValue}
      </Stack>
    </Paper>
  );
}
