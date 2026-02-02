'use client';

import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { formatUserDate } from '../utils/dateFormatters';

export interface UserAuditTimelineProps {
  user: AppUser;
}

/**
 * User audit timeline component
 * Shows key dates in user lifecycle
 *
 * Displays:
 * - Created at
 * - Last role change
 * - Deleted at (if applicable)
 * - Last modified
 *
 * Note: Service doesn't currently track detailed audit trail,
 * but this component is ready for when that's available.
 *
 * @example
 * <UserAuditTimeline user={user} />
 */
export function UserAuditTimeline({ user }: UserAuditTimelineProps) {
  const events = [
    {
      label: 'User Created',
      date: user.createdAt,
      icon: '📝',
    },
    {
      label: 'Last Role Change',
      date: user.roleUpdatedAt,
      icon: '👤',
    },
    ...(user.roleCategoryUpdatedAt
      ? [
          {
            label: 'Last Category Change',
            date: user.roleCategoryUpdatedAt,
            icon: '📂',
          },
        ]
      : []),
    ...(user.deletedAt
      ? [
          {
            label: 'Deleted',
            date: user.deletedAt,
            icon: '🗑️',
          },
        ]
      : []),
    {
      label: 'Last Modified',
      date: user.updatedAt,
      icon: '✏️',
    },
  ];

  return (
    <Paper p="md" withBorder>
      <Group mb="md">
        <IconClock size={20} />
        <Text fw={600}>Audit Timeline</Text>
      </Group>

      <Stack gap="md">
        {events.map((event, idx) => (
          <Group
            key={idx}
            justify="space-between"
            align="flex-start"
            py="sm"
            px="md"
            style={{
              borderLeft: '2px solid var(--mantine-color-gray-3)',
            }}
          >
            <Stack gap={0}>
              <Text size="sm" fw={500}>
                {event.icon} {event.label}
              </Text>
              <Text size="xs" c="dimmed">
                {formatUserDate(event.date)}
              </Text>
            </Stack>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

export default UserAuditTimeline;
