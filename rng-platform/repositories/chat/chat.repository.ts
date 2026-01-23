// Chat Repository (rng-repository extension)
// Firestore Indexes Required:
// 1. chatId (scope-based threads)
// 2. senderId
// 3. timestamp (deterministic ordering)

import { AbstractClientFirestoreRepository } from 'rng-repository';
// Fallback: define ChatMessage type inline (minimal)
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export class ChatRepository extends AbstractClientFirestoreRepository<ChatMessage> {
  // No business logic, no invariants, no RBAC, no auth logic

  // Query messages by chatId (indexed, deterministic)
  async listByChatId(chatId: string): Promise<ChatMessage[]> {
    const result = await this.find({
      where: [
        ['chatId', '==', chatId],
        ['deletedAt', '==', null],
      ],
      orderBy: [['timestamp', 'asc']],
    });
    return result.data;
  }

  // Query messages by sender (indexed, deterministic)
  async listBySender(senderId: string): Promise<ChatMessage[]> {
    const result = await this.find({
      where: [
        ['senderId', '==', senderId],
        ['deletedAt', '==', null],
      ],
      orderBy: [['timestamp', 'asc']],
    });
    return result.data;
  }

  // Append-only: create only, no update/delete except soft delete

  // Soft delete is respected by all queries (deletedAt: null)

  // Error handling: Only infrastructure-level errors may be thrown
}
