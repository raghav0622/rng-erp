'use client';

import { AppUser } from '@/rng-platform';
import { Badge, Card, Group, Stack, Text } from '@mantine/core';
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
  showCreatedAt = false,
  showRoleUpdatedAt = false,
  showRegistrationStatus = false,
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
    <Card padding="xs" radius="md">
      <Stack gap="xs">
        <Group gap="xs">
          <UserAvatar photoUrl={user.photoUrl} name={user.name} size="lg" />
          <Stack gap="0">
            <Text size="md">{user.name}</Text>
            <Text size="xs" c="dimmed">
              {user.email}
            </Text>

            <Group gap="xs" mt="xs">
              <RoleBadge role={user.role} size="md" />

              {user.isDisabled && (
                <Badge color="red" variant="light">
                  Disabled
                </Badge>
              )}
              {user.roleCategory && (
                <Badge variant="dot" color="gray">
                  {user.roleCategory}
                </Badge>
              )}

              {!user.emailVerified && (
                <Badge size="sm" color="orange" variant="dot">
                  Email not verified
                </Badge>
              )}
            </Group>
          </Stack>
        </Group>

        {/* Timestamps */}
        {(showCreatedAt || showRoleUpdatedAt) && (
          <Stack gap="xs">
            {showCreatedAt && user.createdAt && (
              <Group gap="xs">
                <IconClock size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <Text size="xs" c="dimmed">
                  Created: {formatDate(user.createdAt)}
                </Text>
              </Group>
            )}
            {showRoleUpdatedAt && user.roleUpdatedAt && (
              <Group gap="xs">
                <IconClock size={14} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <Text size="xs" c="dimmed">
                  Role updated: {formatDate(user.roleUpdatedAt)}
                </Text>
              </Group>
            )}
          </Stack>
        )}

        {/* Actions */}
        {actions && actions}
      </Stack>
    </Card>
  );
}

export default UserProfileCard;
