// Tickets Domain Service Interface
export interface TicketsService {
  createTicket(params: { clientId: string; subject: string; description: string }): Promise<string>;
  resolveTicket(ticketId: string, resolverId: string): Promise<void>;
  reviewTicket(ticketId: string, clientId: string): Promise<void>;
  getTicket(ticketId: string): Promise<import('./tickets.contract').Ticket>;
}
