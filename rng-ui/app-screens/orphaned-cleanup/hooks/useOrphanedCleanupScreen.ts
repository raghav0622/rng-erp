'use client';

import {
  useCleanupOrphanedUser,
  useListOrphanedUsers,
} from '@/rng-platform/rng-auth/app-auth-hooks';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

export function useOrphanedCleanupScreen() {
  const { data: orphanedUsers = [], refetch: refetchOrphaned } = useListOrphanedUsers();
  const cleanupOrphanedUser = useCleanupOrphanedUser();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [cleaningUserId, setCleaningUserId] = useState<string | null>(null);

  const handleCleanup = async (userId: string) => {
    setExternalErrors([]);
    setCleaningUserId(userId);

    try {
      await cleanupOrphanedUser.mutateAsync({ userId });
      setCleaningUserId(null);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to cleanup orphaned user']);
      setCleaningUserId(null);
    }
  };

  const handleRefresh = async () => {
    const notificationId = 'orphaned-users-refresh';
    notifications.show({
      id: notificationId,
      loading: true,
      title: 'Refreshing',
      message: 'Fetching the latest orphaned users...',
      autoClose: false,
      withCloseButton: false,
    });

    try {
      await refetchOrphaned();
      notifications.show({
        id: notificationId,
        color: 'teal',
        title: 'Refreshed',
        message: 'Orphaned users list updated',
        autoClose: 3000,
      });
    } catch (error) {
      notifications.show({
        id: notificationId,
        color: 'red',
        title: 'Error',
        message: 'Failed to refresh orphaned users',
        autoClose: 3000,
      });
    }
  };

  return {
    orphanedUsers,
    externalErrors,
    cleaningUserId,
    handleCleanup,
    handleRefresh,
  };
}
