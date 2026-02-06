'use client';

import { useAuthSession } from '@/rng-platform/rng-auth';
import { UserDisabledError } from '@/rng-platform/rng-auth/app-auth-service/app-auth.errors';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle, IconClock, IconLock } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

/**
 * Auth notifications provider - shows toast notifications for auth events
 * Monitors auth session changes and notifies user
 */
export function AuthNotificationsProvider() {
  const session = useAuthSession();
  const [lastState, setLastState] = useState<string | null>(null);
  const [lastErrorHandled, setLastErrorHandled] = useState<Date | null>(null);

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

  // Handle authentication errors
  useEffect(() => {
    if (!session.lastAuthError) return;
    
    // Prevent duplicate notifications for the same error
    if (
      lastErrorHandled &&
      Math.abs(session.lastAuthError.timestamp.getTime() - lastErrorHandled.getTime()) < 1000
    ) {
      return;
    }

    const error = session.lastAuthError.error;
    
    // Handle session expiring warning (not an actual error)
    if (error instanceof Error && error.message.startsWith('SESSION_EXPIRING:')) {
      const minutes = error.message.split(':')[1];
      notifications.show({
        id: 'session-expiring-warning',
        title: 'Session Expiring Soon',
        message: `Your session will expire in ${minutes} minute${minutes === '1' ? '' : 's'}. Please save your work.`,
        color: 'yellow',
        icon: <IconClock size={20} />,
        autoClose: 30000, // Show for 30 seconds
      });
      return;
    }
    
    // Handle UserDisabledError - account disabled by owner
    if (error instanceof UserDisabledError) {
      notifications.show({
        title: 'Account Disabled',
        message: 'Your account has been disabled by an administrator. Please contact support.',
        color: 'red',
        icon: <IconLock size={20} />,
        autoClose: false,
        withCloseButton: true,
      });
      setLastErrorHandled(session.lastAuthError.timestamp);
      return;
    }
    
    // Handle session expired
    if (error instanceof Error && error.message.includes('session has expired')) {
      notifications.show({
        title: 'Session Expired',
        message: error.message,
        color: 'orange',
        icon: <IconAlertTriangle size={20} />,
        autoClose: 5000,
      });
      setLastErrorHandled(session.lastAuthError.timestamp);
      return;
    }
    
    // Handle session invalid
    if (error instanceof Error && error.message.includes('session is no longer valid')) {
      notifications.show({
        title: 'Session Invalid',
        message: error.message,
        color: 'orange',
        icon: <IconAlertTriangle size={20} />,
        autoClose: 5000,
      });
      setLastErrorHandled(session.lastAuthError.timestamp);
      return;
    }
  }, [session.lastAuthError, lastErrorHandled]);

  return null;
}
