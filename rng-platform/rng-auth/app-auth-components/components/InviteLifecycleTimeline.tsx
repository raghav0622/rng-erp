'use client';

import { Badge, Group, Paper, Stack, Text, Timeline } from '@mantine/core';
import { IconCheck, IconClock, IconMail, IconX } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';

export interface InviteLifecycleTimelineProps {
  /**
   * User object with invite lifecycle timestamps
   */
  user: AppUser;
  /**
   * Compact mode (smaller spacing)
   */
  compact?: boolean;
}

/**
 * Invite Lifecycle Timeline Component
 *
 * Visualizes the invitation flow for a user:
 * - Invited: When invite was sent
 * - Activated: When user accepted invite (if applicable)
 * - Revoked: When invite was revoked (if applicable)
 *
 * Features:
 * - Timeline visualization
 * - Relative timestamps ("2 days ago")
 * - Status badges
 * - Handles all invite states
 *
 * @example
 * ```tsx
 * <InviteLifecycleTimeline user={user} />
 * ```
 */
export function InviteLifecycleTimeline({ user, compact = false }: InviteLifecycleTimelineProps) {
  const getStatusColor = () => {
    switch (user.inviteStatus) {
      case 'invited':
        return 'blue';
      case 'activated':
        return 'green';
      case 'revoked':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = () => {
    switch (user.inviteStatus) {
      case 'invited':
        return <IconClock size={16} />;
      case 'activated':
        return <IconCheck size={16} />;
      case 'revoked':
        return <IconX size={16} />;
      default:
        return <IconClock size={16} />;
    }
  };

  const getStatusLabel = () => {
    switch (user.inviteStatus) {
      case 'invited':
        return 'Pending';
      case 'activated':
        return 'Activated';
      case 'revoked':
        return 'Revoked';
      default:
        return 'Unknown';
    }
  };

  const formatTimestamp = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Paper p={compact ? 'sm' : 'md'} withBorder>
      <Stack gap={compact ? 'xs' : 'sm'}>
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            Invite Lifecycle
          </Text>
          <Badge color={getStatusColor()} variant="light" leftSection={getStatusIcon()}>
            {getStatusLabel()}
          </Badge>
        </Group>

        <Timeline
          active={user.inviteStatus === 'activated' ? 2 : user.inviteStatus === 'revoked' ? 1 : 0}
          bulletSize={24}
          lineWidth={2}
        >
          <Timeline.Item
            bullet={<IconMail size={12} />}
            title="Invite Sent"
            color={user.inviteSentAt ? 'blue' : 'gray'}
          >
            <Text c="dimmed" size="sm">
              {user.inviteSentAt ? formatTimestamp(user.inviteSentAt) : 'Not sent'}
            </Text>
            {user.inviteSentAt && (
              <Text c="dimmed" size="xs">
                {new Date(user.inviteSentAt).toLocaleString()}
              </Text>
            )}
          </Timeline.Item>

          {user.inviteStatus === 'revoked' && (
            <Timeline.Item bullet={<IconX size={12} />} title="Invite Revoked" color="red">
              <Text c="dimmed" size="sm">
                Invite was revoked by an admin
              </Text>
            </Timeline.Item>
          )}

          {user.inviteStatus === 'activated' && user.inviteRespondedAt && (
            <Timeline.Item bullet={<IconCheck size={12} />} title="Invite Accepted" color="green">
              <Text c="dimmed" size="sm">
                {formatTimestamp(user.inviteRespondedAt)}
              </Text>
              <Text c="dimmed" size="xs">
                {new Date(user.inviteRespondedAt).toLocaleString()}
              </Text>
            </Timeline.Item>
          )}

          {user.inviteStatus === 'invited' && (
            <Timeline.Item bullet={<IconClock size={12} />} title="Awaiting Response" color="gray">
              <Text c="dimmed" size="sm">
                User has not yet accepted the invite
              </Text>
            </Timeline.Item>
          )}
        </Timeline>

        {user.inviteStatus === 'invited' && user.inviteSentAt && (
          <Text size="xs" c="dimmed" ta="center">
            Invite sent {formatTimestamp(user.inviteSentAt)} • Still pending
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

export default InviteLifecycleTimeline;
