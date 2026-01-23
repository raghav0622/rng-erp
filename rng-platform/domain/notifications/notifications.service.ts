// Notifications Domain Service Interface
export interface NotificationsService {
  createNotification(params: { recipientId: string; message: string }): Promise<void>;
  markAsRead(notificationId: string): Promise<void>;
  getNotificationsForUser(
    userId: string,
  ): Promise<import('./notifications.contract').Notification[]>;
}
