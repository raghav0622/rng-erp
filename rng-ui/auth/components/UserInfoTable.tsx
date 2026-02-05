'use client';

import { Paper, SimpleGrid, Stack, Text, type PaperProps } from '@mantine/core';
import type { ReactElement, ReactNode } from 'react';

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
 * Supports both string values and React components (e.g., Badge)
 * Components are rendered outside Text to avoid nesting block elements in paragraphs
 *
 * @example
 * <UserInfoTable items={[
 *   { label: 'Email', value: user.email },
 *   { label: 'Role', value: <Badge>{user.role}</Badge> }
 * ]} />
 */
export default function UserInfoTable({
  items,
  columns = 2,
  showBackground = false,
  ...paperProps
}: UserInfoTableProps) {
  // Check if value is a React element (Badge, custom component, etc.)
  const isElement = (value: ReactNode): value is ReactElement =>
    typeof value === 'object' && value !== null && 'type' in value;

  return (
    <Paper
      p="md"
      withBorder
      style={{
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
            {/* Render JSX components (like Badge) directly outside Text to avoid nesting block in <p> */}
            {isElement(item.value) ? (
              <div>{item.value}</div>
            ) : (
              <Text size="sm" fw={600}>
                {item.value}
              </Text>
            )}
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
