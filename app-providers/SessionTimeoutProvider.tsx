'use client';

import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';

/**
 * Session timeout warnings - warns user before session expires
 * Displays warning at 80% of session time, final warning at 95%
 */
export function SessionTimeoutProvider() {
  const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days
  const WARNING_THRESHOLD_1 = SESSION_MAX_AGE_MS * 0.8; // 4 days
  const WARNING_THRESHOLD_2 = SESSION_MAX_AGE_MS * 0.95; // 4.75 days
  const [warned1, setWarned1] = useState(false);
  const [warned2, setWarned2] = useState(false);

  useEffect(() => {
    // Get session start time from localStorage
    const getSessionStartTime = () => {
      const stored = localStorage.getItem('__session_start_time');
      if (stored) return parseInt(stored);

      // If not stored, assume now and store it
      const now = Date.now();
      localStorage.setItem('__session_start_time', now.toString());
      return now;
    };

    const sessionStartTime = getSessionStartTime();
    const checkInterval = setInterval(
      () => {
        const elapsed = Date.now() - sessionStartTime;

        if (elapsed >= WARNING_THRESHOLD_2 && !warned2) {
          notifications.show({
            title: 'Session Expiring Soon',
            message: 'Your session will expire in less than 6 hours. Please save your work.',
            color: 'red',
            autoClose: false,
          });
          setWarned2(true);
        } else if (elapsed >= WARNING_THRESHOLD_1 && !warned1) {
          notifications.show({
            title: 'Session Expires in ~24 Hours',
            message: 'Your session will expire soon. You will need to sign in again.',
            color: 'yellow',
            autoClose: 5000,
          });
          setWarned1(true);
        }

        // Clear session start time on logout (when elapsed > max)
        if (elapsed >= SESSION_MAX_AGE_MS) {
          localStorage.removeItem('__session_start_time');
          clearInterval(checkInterval);
        }
      },
      60 * 60 * 1000,
    ); // Check every hour

    return () => clearInterval(checkInterval);
  }, [warned1, warned2]);

  return null;
}
