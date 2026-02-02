'use client';

import { Group } from '@mantine/core';
import { IconUsers } from '@tabler/icons-react';
import EmptyState from './EmptyState';

/**
 * Empty state for user list/search results
 */
export function NoUsersEmptyState() {
  return (
    <EmptyState
      icon={IconUsers}
      title="No users found"
      description="Try adjusting your search criteria"
    />
  );
}

/**
 * Empty state for pending invitations
 */
export function NoInvitesEmptyState() {
  return (
    <EmptyState title="No pending invitations" description="All invited users have responded" />
  );
}

/**
 * Empty state for orphaned users (cleanup)
 */
export function NoOrphanedUsersEmptyState() {
  return (
    <EmptyState
      title="System is clean"
      description="No orphaned Firebase Auth users detected. All users are properly synced."
    />
  );
}

/**
 * Empty state for deleted users
 */
export function NoDeletedUsersEmptyState() {
  return <EmptyState title="No deleted users" description="No users have been soft-deleted" />;
}

/**
 * Empty state with action button
 */
export function EmptyStateWithAction({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Group>
          <button onClick={onAction} style={{ cursor: 'pointer' }}>
            {actionLabel}
          </button>
        </Group>
      }
    />
  );
}

export default EmptyState;
