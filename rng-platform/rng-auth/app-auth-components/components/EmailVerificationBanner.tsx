'use client';

import { Alert, Button, Group } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useSendEmailVerification } from '../../app-auth-hooks/useAuthMutations';
import { useCurrentUser } from '../../app-auth-hooks/useUserQueries';

export interface EmailVerificationBannerProps {
  /**
   * Hide banner even if email not verified
   * @default false
   */
  forceHide?: boolean;
  /**
   * Success callback after sending verification
   */
  onSent?: () => void;
}

/**
 * Banner displayed when user's email is not verified
 *
 * Features:
 * - Auto-shows when emailVerified is false
 * - Inline resend button
 * - Loading state during send
 * - Success feedback
 * - Dismissible (hides until page reload)
 *
 * @example
 * // In app layout or dashboard
 * <EmailVerificationBanner />
 */
export function EmailVerificationBanner({ forceHide, onSent }: EmailVerificationBannerProps) {
  const { data: currentUser } = useCurrentUser();
  const sendVerification = useSendEmailVerification();
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);

  if (forceHide || dismissed || !currentUser || currentUser.emailVerified || sent) {
    return null;
  }

  const handleSend = async () => {
    try {
      await sendVerification.mutateAsync();
      setSent(true);
      if (onSent) onSent();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  return (
    <Alert
      icon={<IconAlertCircle size={16} />}
      title="Email Verification Required"
      color="orange"
      withCloseButton
      onClose={() => setDismissed(true)}
    >
      <Group justify="space-between" align="center">
        <div>
          Please verify your email address to access all features. Check your inbox for a
          verification link.
        </div>
        <Button
          size="xs"
          variant="light"
          color="orange"
          onClick={handleSend}
          loading={sendVerification.isPending}
        >
          Resend Email
        </Button>
      </Group>
    </Alert>
  );
}

export default EmailVerificationBanner;
