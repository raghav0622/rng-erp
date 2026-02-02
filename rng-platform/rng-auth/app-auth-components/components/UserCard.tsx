'use client';

import { Avatar, Badge, Card, Group, Stack, Text } from '@mantine/core';
import { IconMail, IconUser } from '@tabler/icons-react';
import { memo } from 'react';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import RoleBadge from './RoleBadge';

export interface UserCardProps {
  user: AppUser;
  /**
   * Show email
   * @default true
   */
  showEmail?: boolean;
  /**
   * Show role badge
   * @default true
   */
  showRole?: boolean;
  /**
   * Show invite status
   * @default false
   */
  showInviteStatus?: boolean;
  /**
   * Show disabled badge
   * @default true
   */
  showDisabledBadge?: boolean;
  /**
   * Card variant
   * @default 'default'
   */
  variant?: 'default' | 'compact' | 'detailed';
  /**
   * Optional action buttons
   */
  actions?: React.ReactNode;
  /**
   * Click handler
   */
  onClick?: () => void;
}

/**
 * Reusable user display card
 *
 * Features:
 * - User photo/avatar
 * - Name and email display
 * - Role badge
 * - Status indicators (disabled, invite status)
 * - Optional action buttons
 * - Multiple display variants
 *
 * @example
 * <UserCard
 *   user={user}
 *   showRole
 *   showEmail
 *   actions={
 *     <Button size="xs">Edit</Button>
 *   }
 * />
 */
export function UserCard({
  user,
  showEmail = true,
  showRole = true,
  showInviteStatus = false,
  showDisabledBadge = true,
  variant = 'default',
  actions,
  onClick,
}: UserCardProps) {
  const isCompact = variant === 'compact';
  const isDetailed = variant === 'detailed';

  return (
    <Card
      padding={isCompact ? 'xs' : 'md'}
      withBorder
      style={{ cursor: onClick ? 'pointer' : undefined }}
      onClick={onClick}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap={isCompact ? 'xs' : 'md'} wrap="nowrap">
          <Avatar src={user.photoUrl} size={isCompact ? 'md' : 'lg'} radius="xl">
            <IconUser size={isCompact ? 20 : 24} />
          </Avatar>

          <Stack gap={2}>
            <Group gap="xs">
              <Text size={isCompact ? 'sm' : 'md'} fw={500}>
                {user.name}
              </Text>
              {showDisabledBadge && user.isDisabled && (
                <Badge size="xs" color="red" variant="light">
                  Disabled
                </Badge>
              )}
              {!user.emailVerified && (
                <Badge size="xs" color="orange" variant="light">
                  Unverified
                </Badge>
              )}
            </Group>

            {showEmail && (
              <Group gap={4}>
                <IconMail size={12} style={{ color: 'var(--mantine-color-dimmed)' }} />
                <Text size="xs" c="dimmed">
                  {user.email}
                </Text>
              </Group>
            )}

            {showRole && (
              <Group gap="xs">
                <RoleBadge role={user.role} size={isCompact ? 'xs' : 'sm'} />
                {isDetailed && user.roleCategory && (
                  <Badge size="xs" variant="dot" color="gray">
                    {user.roleCategory}
                  </Badge>
                )}
              </Group>
            )}

            {showInviteStatus && user.inviteStatus !== 'activated' && (
              <Badge
                size="xs"
                color={
                  user.inviteStatus === 'invited'
                    ? 'blue'
                    : user.inviteStatus === 'revoked'
                      ? 'red'
                      : 'gray'
                }
                variant="light"
              >
                {user.inviteStatus === 'invited' && 'Invite Sent'}
                {user.inviteStatus === 'revoked' && 'Invite Revoked'}
              </Badge>
            )}
          </Stack>
        </Group>

        {actions && <div>{actions}</div>}
      </Group>
    </Card>
  );
}

export default memo(UserCard);
