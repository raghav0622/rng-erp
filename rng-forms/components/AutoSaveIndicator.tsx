'use client';

import { Badge, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

interface AutoSaveIndicatorProps {
  /**
   * The timestamp of the last save
   */
  lastSaved: Date | null;
  /**
   * Custom label prefix (default: "Saved")
   */
  label?: string;
  /**
   * Show as badge or plain text (default: badge)
   */
  variant?: 'badge' | 'text';
}

/**
 * Displays "Saved X minutes ago" indicator with live updates
 *
 * @example
 * const { lastSaved } = useFormPersistence({ key: 'my-form' });
 * <AutoSaveIndicator lastSaved={lastSaved} />
 */
export function AutoSaveIndicator({
  lastSaved,
  label = 'Saved',
  variant = 'badge',
}: AutoSaveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    if (!lastSaved) {
      return;
    }

    const updateTimeAgo = () => {
      const now = new Date();
      const diffMs = now.getTime() - lastSaved.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);

      if (diffSeconds < 10) {
        setTimeAgo('just now');
      } else if (diffSeconds < 60) {
        setTimeAgo(`${diffSeconds} seconds ago`);
      } else if (diffMinutes < 60) {
        setTimeAgo(`${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`);
      } else if (diffHours < 24) {
        setTimeAgo(`${diffHours} hour${diffHours > 1 ? 's' : ''} ago`);
      } else {
        setTimeAgo(lastSaved.toLocaleDateString());
      }
    };

    updateTimeAgo();

    // Update every 10 seconds
    const interval = setInterval(updateTimeAgo, 10000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  if (!lastSaved || !timeAgo) {
    return null;
  }

  const displayText = `${label} ${timeAgo}`;

  if (variant === 'text') {
    return (
      <Text size="xs" c="dimmed">
        {displayText}
      </Text>
    );
  }

  return (
    <Badge variant="light" color="green" size="sm">
      {displayText}
    </Badge>
  );
}
