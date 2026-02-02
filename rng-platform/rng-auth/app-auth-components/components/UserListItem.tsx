'use client';

import { Group, Paper, Stack, Text, type PaperProps } from '@mantine/core';
import { memo } from 'react';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import RoleBadge from './RoleBadge';
import UserStatusBadge from './UserStatusBadge';

export interface UserListItemProps extends Omit<PaperProps, 'onClick'> {
  user: AppUser;
  onClick: () => void;
  showRoleCategory?: boolean;
}

/**
 * UserListItem - Standardized list row for user results
 * Memoized to prevent unnecessary re-renders in large lists
 */
function UserListItem({
  user,
  onClick,
  showRoleCategory = true,
  ...paperProps
}: UserListItemProps) {
  return (
    <Paper
      shadow="xs"
      p="md"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      tabIndex={0}
      {...paperProps}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group gap="sm">
            <Text fw={600}>{user.name}</Text>
            <UserStatusBadge user={user} />
          </Group>
          <Text size="sm" c="dimmed">
            {user.email}
          </Text>
          {showRoleCategory && user.roleCategory && (
            <Text size="xs" c="dimmed">
              Category: {user.roleCategory}
            </Text>
          )}
        </Stack>
        <Group gap="xs">
          <RoleBadge role={user.role} />
        </Group>
      </Group>
    </Paper>
  );
}

export default memo(UserListItem);
