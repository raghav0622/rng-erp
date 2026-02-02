'use client';

import { Badge, type BadgeProps } from '@mantine/core';

export interface OrphanedUserBadgeProps extends Omit<BadgeProps, 'color' | 'children'> {}

/**
 * OrphanedUserBadge - Indicates an orphaned Firebase Auth user
 */
export default function OrphanedUserBadge(props: OrphanedUserBadgeProps) {
  return (
    <Badge color="red" variant="light" {...props}>
      Orphaned
    </Badge>
  );
}
