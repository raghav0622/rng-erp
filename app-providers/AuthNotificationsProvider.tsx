'use client';

import { useAuthSession } from '@/rng-platform/rng-auth';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';

/**
 * Auth notifications provider - shows toast notifications for auth events
 * Monitors auth session changes and notifies user
 */
export function AuthNotificationsProvider() {
  const session = useAuthSession();
  const [lastState, setLastState] = useState<string | null>(null);

  useEffect(() => {
    if (session.state === lastState) return;

    if (session.state === 'authenticated') {
      notifications.show({
        title: 'Welcome back!',
        message: `Signed in as ${session.user?.email || 'User'}`,
        color: 'green',
        autoClose: 3000,
      });
    }

    if (session.state === 'unauthenticated' && lastState === 'authenticated') {
      notifications.show({
        title: 'Signed out',
        message: 'You have been successfully signed out',
        color: 'blue',
        autoClose: 2000,
      });
    }

    setLastState(session.state);
  }, [session.state, session.user?.email, lastState]);

  return null;
}
