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

export interface ChatService {
  createMessage(params: { chatId: string; senderId: string; content: string }): Promise<void>;
  getMessages(chatId: string): Promise<ChatMessage[]>;
  createChat(params: { scope: string }): Promise<string>;
}
