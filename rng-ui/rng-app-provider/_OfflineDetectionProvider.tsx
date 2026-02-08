'use client';

import { showNotificationOnce } from '@/rng-ui/ux';
import { IconWifiOff } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

/**
 * Offline detection - shows notification when user goes offline
 * Hides forms and prevents submissions when offline
 */
export function OfflineDetectionProvider() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      showNotificationOnce({
        dedupeKey: 'back-online',
        title: 'Back Online',
        message: 'Your connection has been restored',
        color: 'green',
        autoClose: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      showNotificationOnce({
        id: 'offline-notification',
        title: 'Offline',
        message: 'You are currently offline. Some features may be limited.',
        color: 'red',
        icon: <IconWifiOff size={18} />,
        autoClose: false,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Store online state globally for forms to access
  useEffect(() => {
    (window as any).__isOnline = isOnline;
  }, [isOnline]);

  return null;
}
