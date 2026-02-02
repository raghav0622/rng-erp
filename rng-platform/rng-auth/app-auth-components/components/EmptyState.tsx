'use client';

import { Center, Paper, Stack, Text } from '@mantine/core';
import { IconInbox } from '@tabler/icons-react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ size: number; color?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const defaultIconSize = 48;
const defaultIconColor = 'var(--mantine-color-gray-5)';

/**
 * Generic empty state component
 * Used when no data is available
 */
export function EmptyState({
  icon: Icon = IconInbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Center py="xl">
      <Paper p="xl" withBorder>
        <Stack gap="md" align="center" maw={300}>
          <Icon size={defaultIconSize} color={defaultIconColor} />
          <Text fw={600} size="lg">
            {title}
          </Text>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
          {action && <div>{action}</div>}
        </Stack>
      </Paper>
    </Center>
  );
}

export default EmptyState;
