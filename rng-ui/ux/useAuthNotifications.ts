'use client';

import { notifications } from '@mantine/notifications';

/**
 * DRY utility hook for auth flow notifications
 * Provides consistent notification UX across all auth pages
 */

export function useAuthNotifications() {
  const showSuccess = (message: string, title?: string) => {
    notifications.show({
      title: title || 'Success',
      message,
      color: 'green',
      autoClose: 4000,
    });
  };

  const showError = (message: string, title?: string) => {
    notifications.show({
      title: title || 'Error',
      message,
      color: 'red',
      autoClose: 5000,
    });
  };

  const showInfo = (message: string, title?: string) => {
    notifications.show({
      title: title || 'Info',
      message,
      color: 'blue',
      autoClose: 3000,
    });
  };

  const showLoading = (message: string, id?: string) => {
    const notifId = id || `loading-${Date.now()}`;
    notifications.show({
      id: notifId,
      title: 'Loading',
      message,
      loading: true,
      autoClose: false,
      withCloseButton: false,
    });
    return notifId;
  };

  const hideLoading = (id: string) => {
    notifications.hide(id);
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showLoading,
    hideLoading,
  };
}
