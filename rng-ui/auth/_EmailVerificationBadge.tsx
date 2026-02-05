'use client';

import { Alert, type AlertProps } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { hasVerifiedEmail } from './utils/userHelpers';

export interface EmailVerificationBadgeProps extends Omit<AlertProps, 'title' | 'children'> {
  /**
   * User object to check email verification status
   */
  user: AppUser | null | undefined;
  /**
   * Custom message to display (optional)
   */
  message?: string;
  /**
   * Show as inline badge instead of alert (default: false)
   */
  inline?: boolean;
}

/**
 * EmailVerificationBadge - Display warning when user's email is not verified
 *
 * Only renders when emailVerified is false.
 * Can be displayed as full alert or inline badge.
 *
 * @example
 * ```tsx
 * <EmailVerificationBadge user={user} />
 * <EmailVerificationBadge user={user} inline />
 * <EmailVerificationBadge user={user} message="Custom message" />
 * ```
 */
export default function EmailVerificationBadge({
  user,
  message = 'Email not verified',
  inline = false,
  ...alertProps
}: EmailVerificationBadgeProps) {
  // Only render if user exists and email is not verified
  if (!user || hasVerifiedEmail(user)) {
    return null;
  }

  if (inline) {
    return (
      <Alert
        icon={<IconAlertCircle size={14} />}
        variant="light"
        styles={{
          root: {
            display: 'inline-flex',
            padding: '4px 12px',
            fontSize: '0.875rem',
          },
          icon: {
            marginRight: '8px',
          },
        }}
        {...alertProps}
      >
        {message}
      </Alert>
    );
  }

  return (
    <Alert icon={<IconAlertCircle size={16} />} variant="light" {...alertProps}>
      {message}
    </Alert>
  );
}
