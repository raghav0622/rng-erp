'use client';

import { Paper, SimpleGrid, Stack, Text, type PaperProps } from '@mantine/core';
import type { ReactNode } from 'react';

export interface UserInfoItem {
  label: string;
  value: ReactNode;
  description?: ReactNode;
}

export interface UserInfoTableProps extends Omit<PaperProps, 'children'> {
  items: UserInfoItem[];
  columns?: number;
  showBackground?: boolean;
}

/**
 * UserInfoTable - Consistent key/value display for user details
 *
 * @example
 * <UserInfoTable items={[{ label: 'Email', value: user.email }]} />
 */
export default function UserInfoTable({
  items,
  columns = 2,
  showBackground = true,
  ...paperProps
}: UserInfoTableProps) {
  return (
    <Paper
      p="md"
      withBorder
      style={{
        backgroundColor: showBackground ? 'var(--mantine-color-gray-0)' : undefined,
        borderRadius: 'var(--mantine-radius-md)',
      }}
      {...paperProps}
    >
      <SimpleGrid cols={columns} spacing="md">
        {items.map((item) => (
          <Stack key={item.label} gap={4}>
            <Text size="sm" c="dimmed">
              {item.label}
            </Text>
            <Text size="sm" fw={600}>
              {item.value}
            </Text>
            {item.description && (
              <Text size="xs" c="dimmed">
                {item.description}
              </Text>
            )}
          </Stack>
        ))}
      </SimpleGrid>
    </Paper>
  );
}
