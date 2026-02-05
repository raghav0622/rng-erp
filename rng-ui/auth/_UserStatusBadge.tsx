'use client';

import { AppUser } from '@/rng-platform';
import { Badge, type BadgeProps } from '@mantine/core';
import { getUserStatusLabel, getUserStatusPriority } from './utils/userHelpers';

export interface UserStatusBadgeProps extends Omit<BadgeProps, 'color' | 'children'> {
  /**
   * User object to display status for
   */
  user: AppUser | null | undefined;
  /**
   * Show only if user has non-active status (default: false)
   */
  onlyShowNonActive?: boolean;
}

/**
 * UserStatusBadge - Display user's current status with priority-based coloring
 *
 * Priority hierarchy (highest to lowest):
 * 1. Deleted (red)
 * 2. Disabled (orange)
 * 3. Revoked (pink)
 * 4. Invited/Pending (yellow)
 * 5. Active (green)
 *
 * @example
 * ```tsx
 * <UserStatusBadge user={user} />
 * <UserStatusBadge user={user} onlyShowNonActive /> // Only shows if not active
 * <UserStatusBadge user={user} size="lg" />
 * ```
 */
export function UserStatusBadge({
  user,
  onlyShowNonActive = false,
  ...badgeProps
}: UserStatusBadgeProps) {
  if (!user) return null;

  const status = getUserStatusLabel(user);
  const priority = getUserStatusPriority(user);

  // Skip rendering if onlyShowNonActive and user is active
  if (onlyShowNonActive && priority === 1) {
    return null;
  }

  // Determine badge color based on priority
  let color: string;
  switch (priority) {
    case 5: // Deleted
      color = 'red';
      break;
    case 4: // Disabled
      color = 'orange';
      break;
    case 3: // Revoked
      color = 'pink';
      break;
    case 2: // Invited
      color = 'yellow';
      break;
    default: // Active
      color = 'green';
  }

  return (
    <Badge color={color} variant="light" {...badgeProps}>
      {status}
    </Badge>
  );
}
