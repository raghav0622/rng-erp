'use client';

import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import { IconClock, IconUser } from '@tabler/icons-react';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { RoleBadge } from './RoleBadge';
import { UserAvatar } from './UserAvatar';

export interface UserProfileCardProps {
  user: AppUser;
  /**
   * Show creation date
   * @default true
   */
  showCreatedAt?: boolean;
  /**
   * Show role updated date
   * @default false
   */
  showRoleUpdatedAt?: boolean;
  /**
   * Show registration status
   * @default true
   */
  showRegistrationStatus?: boolean;
  /**
   * Optional action buttons
   */
  actions?: React.ReactNode;
}

/**
 * Rich user profile display card
 *
 * Features:
 * - Large avatar
 * - Full name and email
 * - Role with badge
 * - Registration status
 * - Timestamps
 * - Status indicators
 * - Optional actions
 *
 * @example
 * <UserProfileCard
 *   user={user}
 *   showCreatedAt
 *   actions={<Button>Edit Profile</Button>}
 * />
 */
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
    <Card withBorder padding="lg" radius="md">
      <Stack gap="md">
        {/* Avatar and name */}
        <Group gap="md">
          <UserAvatar photoUrl={user.photoUrl} name={user.name} size="xl" />
          <Stack gap={4}>
            <Group gap="xs">
              <Text size="xl" fw={700}>
                {user.name}
              </Text>
              {user.isDisabled && (
                <Badge color="red" variant="light">
                  Disabled
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              {user.email}
            </Text>
            {!user.emailVerified && (
              <Badge size="sm" color="orange" variant="dot">
                Email not verified
              </Badge>
            )}
          </Stack>
        </Group>

        {/* Role and status */}
        <Group gap="md">
          <RoleBadge role={user.role} size="md" />
          {user.roleCategory && (
            <Badge variant="dot" color="gray">
              {user.roleCategory}
            </Badge>
          )}
          {showRegistrationStatus && (
            <Badge
              color={user.isRegisteredOnERP ? 'green' : 'blue'}
              variant="light"
              leftSection={<IconUser size={12} />}
            >
              {user.isRegisteredOnERP ? 'Registered' : 'Invited'}
            </Badge>
          )}
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
