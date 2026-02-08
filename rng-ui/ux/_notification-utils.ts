'use client';

import { notifications, type NotificationData } from '@mantine/notifications';

const recentNotifications = new Map<string, number>();
const DEDUPE_WINDOW_MS = 1200;

const normalizeText = (value: unknown) => (typeof value === 'string' ? value : '');

const buildIdFromKey = (key: string) => {
  const normalized = key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `notice-${normalized.slice(0, 60) || 'generic'}`;
};

const resolveNotificationId = (data: NotificationData & { dedupeKey?: string }) => {
  if (data.id) return data.id;
  if (data.dedupeKey) return buildIdFromKey(data.dedupeKey);

  const title = normalizeText(data.title) || 'notice';
  const message = normalizeText(data.message) || 'message';
  return buildIdFromKey(`${title}-${message}`);
};

// Clean up old notification entries to prevent memory bloat
function cleanupOldEntries() {
  const now = Date.now();
  const cutoff = now - DEDUPE_WINDOW_MS;

  for (const [id, timestamp] of recentNotifications.entries()) {
    if (timestamp < cutoff) {
      recentNotifications.delete(id);
    }
  }
}

export function showNotificationOnce(data: NotificationData & { dedupeKey?: string }) {
  const id = resolveNotificationId(data);
  const now = Date.now();
  const lastShown = recentNotifications.get(id);

  if (lastShown && now - lastShown < DEDUPE_WINDOW_MS) {
    return id;
  }

  // Extract dedupeKey to prevent it from being passed to DOM
  const { dedupeKey, ...notificationData } = data;

  recentNotifications.set(id, now);

  // Periodically clean up old entries (every ~50 notifications)
  if (recentNotifications.size > 50) {
    cleanupOldEntries();
  }

  notifications.show({ ...notificationData, id });
  return id;
}

export function hideNotification(id: string) {
  notifications.hide(id);
}
