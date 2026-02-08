'use client';

import type { NotificationData } from '@mantine/notifications';
import { hideNotification, showNotificationOnce } from './_notification-utils';

type RNGNotificationOptions = {
  id?: string;
  dedupeKey?: string;
  autoClose?: NotificationData['autoClose'];
};

export function useRNGNotification() {
  const showSuccess = (message: string, title?: string, options?: RNGNotificationOptions) => {
    showNotificationOnce({
      id: options?.id,
      dedupeKey: options?.dedupeKey,
      title: title || 'Success',
      message,
      color: 'green',
      autoClose: options?.autoClose ?? 4000,
    });
  };

  const showError = (message: string, title?: string, options?: RNGNotificationOptions) => {
    showNotificationOnce({
      id: options?.id,
      dedupeKey: options?.dedupeKey,
      title: title || 'Error',
      message,
      color: 'red',
      autoClose: options?.autoClose ?? 5000,
    });
  };

  const showInfo = (message: string, title?: string, options?: RNGNotificationOptions) => {
    showNotificationOnce({
      id: options?.id,
      dedupeKey: options?.dedupeKey,
      title: title || 'Info',
      message,
      color: 'blue',
      autoClose: options?.autoClose ?? 3000,
    });
  };

  const showLoading = (message: string, id?: string) => {
    const notifId = id || `loading-${Date.now()}`;
    showNotificationOnce({
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
    hideNotification(id);
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showLoading,
    hideLoading,
  };
}
