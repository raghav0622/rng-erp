'use client';

import { AppUser } from '@/rng-platform';
import { Group, Stack, Text } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { RoleBadge } from './_RoleBadge';
import { UserAvatar } from './_UserAvatar';

export interface UserProfileCardProps {
  user: AppUser;
  showCreatedAt?: boolean;
  showRoleUpdatedAt?: boolean;
  showRegistrationStatus?: boolean;
  actions?: React.ReactNode;
}

export function UserProfileCard({
  user,
  showCreatedAt = true,
  showRoleUpdatedAt = false,
  showRegistrationStatus = true,
  actions,
}: UserProfileCardProps) {
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Stack gap="sm">
      <Group gap="sm" align="flex-start">
        <UserAvatar photoUrl={user.photoUrl} name={user.name} size="lg" />
        <Stack gap="xs">
          <Stack gap="2">
            <Text fw={500} size="sm" lh={1}>
              {user.name}
            </Text>
            <Text size="xs" c="dimmed" lh={1}>
              {user.email}
            </Text>
          </Stack>
          <RoleBadge role={user.role} size="sm" />
        </Stack>
      </Group>

      {/* Timestamps */}
      {(showCreatedAt || showRoleUpdatedAt) && (
        <Stack gap="xs">
          {showCreatedAt && user.createdAt && (
            <Group gap="xs" align="center">
              <IconClock size={13} style={{ color: 'var(--mantine-color-dimmed)' }} />
              <Text size="xs" c="dimmed">
                Created {formatDate(user.createdAt)}
              </Text>
            </Group>
          )}
          {showRoleUpdatedAt && user.roleUpdatedAt && (
            <Group gap="xs" align="center">
              <IconClock size={13} style={{ color: 'var(--mantine-color-dimmed)' }} />
              <Text size="xs" c="dimmed">
                Role updated {formatDate(user.roleUpdatedAt)}
              </Text>
            </Group>
          )}
        </Stack>
      )}

      {/* Actions */}
      {actions && actions}
    </Stack>
  );
}

export default UserProfileCard;
