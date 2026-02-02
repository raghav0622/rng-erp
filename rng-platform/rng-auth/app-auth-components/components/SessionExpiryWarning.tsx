'use client';

import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconClock } from '@tabler/icons-react';
import { Suspense, useEffect, useState } from 'react';
import { useAuthSession } from '../../../rng-auth';

export interface SessionExpiryWarningProps {
  /**
   * Warning threshold in minutes before expiry (default: 5)
   */
  warningThresholdMinutes?: number;
  /**
   * Custom message (optional)
   */
  message?: string;
  /**
   * Called when user clicks "Stay Signed In"
   */
  onExtendSession?: () => void;
}

/**
 * Session Expiry Warning Component
 *
 * Shows a warning banner when user's session is about to expire.
 * Uses 24-hour local UX timeout from AppAuthService.
 *
 * Features:
 * - Real-time countdown timer
 * - Prominent warning banner
 * - "Stay Signed In" action (triggers activity)
 * - Suspense-friendly
 * - Only shows when authenticated
 *
 * @example
 * ```tsx
 * // In AppShell or dashboard layout
 * <SessionExpiryWarning
 *   warningThresholdMinutes={5}
 *   onExtendSession={() => {
 *     // Trigger any user action to refresh session
 *     queryClient.invalidateQueries();
 *   }}
 * />
 * ```
 */
export function SessionExpiryWarning({
  warningThresholdMinutes = 5,
  message,
  onExtendSession,
}: SessionExpiryWarningProps) {
  return (
    <Suspense fallback={null}>
      <SessionExpiryWarningInner
        warningThresholdMinutes={warningThresholdMinutes}
        message={message}
        onExtendSession={onExtendSession}
      />
    </Suspense>
  );
}

function SessionExpiryWarningInner({
  warningThresholdMinutes = 5,
  message,
  onExtendSession,
}: SessionExpiryWarningProps) {
  const session = useAuthSession();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (session.state !== 'authenticated' || !session.sessionExpiresAt || dismissed) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const expiresAt = session.sessionExpiresAt!;
      const remaining = expiresAt.getTime() - now.getTime();

      const thresholdMs = warningThresholdMinutes * 60 * 1000;

      if (remaining <= 0) {
        setTimeRemaining(0);
      } else if (remaining <= thresholdMs) {
        setTimeRemaining(Math.ceil(remaining / 1000)); // seconds
      } else {
        setTimeRemaining(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session, warningThresholdMinutes, dismissed]);

  if (!timeRemaining || timeRemaining <= 0 || dismissed) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  const handleStaySignedIn = () => {
    setDismissed(true);
    if (onExtendSession) {
      onExtendSession();
    }
  };

  return (
    <Alert
      icon={<IconAlertCircle size={20} />}
      color="yellow"
      variant="filled"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        borderRadius: 0,
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={4}>
          <Group gap="xs">
            <IconClock size={16} />
            <Text size="sm" fw={600}>
              Session Expiring Soon
            </Text>
          </Group>
          <Text size="sm">
            {message ||
              `Your session will expire in ${timeString}. You'll be signed out automatically.`}
          </Text>
        </Stack>

        <Button variant="white" size="sm" onClick={handleStaySignedIn} style={{ flexShrink: 0 }}>
          Stay Signed In
        </Button>
      </Group>
    </Alert>
  );
}

export default SessionExpiryWarning;
