'use client';

import { Badge, type BadgeProps } from '@mantine/core';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';

export interface InviteStatusBadgeProps extends Omit<BadgeProps, 'color' | 'children'> {
  /**
   * User object to display invite status for
   */
  user: AppUser | null | undefined;
  /**
   * Show detailed status labels (default: false)
   * If true, shows "Invite Sent", "Invite Accepted", "Invite Revoked"
   * If false, shows "Invited", "Activated", "Revoked"
   */
  detailed?: boolean;
}

/**
 * InviteStatusBadge - Display user's invite lifecycle status
 *
 * Invite lifecycle states:
 * - invited: User has been invited but not yet accepted
 * - activated: User has accepted invite and registered
 * - revoked: Invite was revoked by an admin
 *
 * @example
 * ```tsx
 * <InviteStatusBadge user={user} />
 * <InviteStatusBadge user={user} detailed /> // Shows "Invite Sent" instead of "Invited"
 * <InviteStatusBadge user={user} size="sm" />
 * ```
 */
export default function InviteStatusBadge({
  user,
  detailed = false,
  ...badgeProps
}: InviteStatusBadgeProps) {
  if (!user) return null;

  const { inviteStatus } = user;

  // Determine badge color and label based on invite status
  let color: string;
  let label: string;

  switch (inviteStatus) {
    case 'invited':
      color = 'yellow';
      label = detailed ? 'Invite Sent' : 'Invited';
      break;
    case 'activated':
      color = 'green';
      label = detailed ? 'Invite Accepted' : 'Activated';
      break;
    case 'revoked':
      color = 'red';
      label = detailed ? 'Invite Revoked' : 'Revoked';
      break;
    default:
      // Unknown status - shouldn't happen but handle gracefully
      color = 'gray';
      label = 'Unknown';
  }

  return (
    <Badge color={color} variant="light" {...badgeProps}>
      {label}
    </Badge>
  );
}
