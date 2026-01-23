// Chat Domain Service Implementation
// Fallback: define ChatMessage interface inline
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
import type { ChatService } from './chat.service';

export class ChatServiceImpl implements ChatService {
  async createMessage(params: {
    chatId: string;
    senderId: string;
    content: string;
  }): Promise<void> {
    /* ... */
  }
  async getMessages(chatId: string): Promise<ChatMessage[]> {
    /* ... */ return [];
  }
  async createChat(params: { scope: string }): Promise<string> {
    /* ... */ return '';
  }
}
