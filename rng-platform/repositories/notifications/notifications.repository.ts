// Notifications Repository (rng-repository extension)
// Firestore Indexes Required:
// 1. recipientId (user inbox)
// 2. read (read/unread filter)
// 3. deliveryState

import { AbstractClientFirestoreRepository } from 'rng-repository';
// Fallback: define Notification interface inline (minimal)
export interface Notification {
  id: string;
  recipientId: string;
  message: string;
  read: boolean;
  deliveryState: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class NotificationsRepository extends AbstractClientFirestoreRepository<Notification> {
  // No business logic, no invariants, no RBAC, no auth logic

  // Query notifications for user (indexed, deterministic)
  async listByRecipient(recipientId: string): Promise<Notification[]> {
    const result = await this.find({
      where: [
        ['recipientId', '==', recipientId],
        ['deletedAt', '==', null],
      ],
    });
    return result.data;
  }

  // Query notifications by read/unread (indexed, deterministic)
  async listByReadState(recipientId: string, read: boolean): Promise<Notification[]> {
    const result = await this.find({
      where: [
        ['recipientId', '==', recipientId],
        ['read', '==', read],
        ['deletedAt', '==', null],
      ],
    });
    return result.data;
  }

  // Query notifications by delivery state (indexed, deterministic)
  async listByDeliveryState(deliveryState: string): Promise<Notification[]> {
    const result = await this.find({
      where: [
        ['deliveryState', '==', deliveryState],
        ['deletedAt', '==', null],
      ],
    });
    return result.data;
  }

  // Soft delete is respected by all queries (deletedAt: null)

  // Error handling: Only infrastructure-level errors may be thrown
}
