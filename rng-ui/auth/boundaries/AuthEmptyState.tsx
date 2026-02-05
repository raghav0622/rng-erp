'use client';

import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { IconUserOff } from '@tabler/icons-react';
import type { ReactNode } from 'react';

export interface AuthEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  fullHeight?: boolean;
}

export function AuthEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  fullHeight = false,
}: AuthEmptyStateProps) {
  return (
    <Center style={{ minHeight: fullHeight ? '100dvh' : '300px' }}>
      <Stack gap="lg" align="center" maw={400}>
        <div style={{ color: 'var(--mantine-color-dimmed)' }}>
          {icon || <IconUserOff size={64} stroke={1.5} />}
        </div>
        <Stack gap="xs" align="center">
          <Title order={3}>{title}</Title>
          {description && (
            <Text size="sm" c="dimmed" ta="center">
              {description}
            </Text>
          )}
        </Stack>
        {actionLabel && onAction && (
          <Button onClick={onAction} variant="light">
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Center>
  );
}
