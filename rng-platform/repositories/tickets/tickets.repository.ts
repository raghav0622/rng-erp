// Tickets Repository (rng-repository extension)
// Firestore Indexes Required:
// 1. status
// 2. createdBy
// 3. assignedTo

import { AbstractClientFirestoreRepository } from 'rng-repository';
import type { Ticket } from '../../domain/tickets/tickets.contract';

export class TicketsRepository extends AbstractClientFirestoreRepository<Ticket> {
  // No business logic, no invariants, no RBAC, no auth logic

  // Query tickets by status (indexed, deterministic)
  async listByStatus(status: string): Promise<Ticket[]> {
    return await this.find({ where: { status, deletedAt: null } });
  }

  // Query tickets by creator (indexed, deterministic)
  async listByCreator(createdBy: string): Promise<Ticket[]> {
    return await this.find({ where: { createdBy, deletedAt: null } });
  }

  // Query tickets by assignee (indexed, deterministic)
  async listByAssignee(assignedTo: string): Promise<Ticket[]> {
    return await this.find({ where: { assignedTo, deletedAt: null } });
  }

  // Soft delete is respected by all queries (deletedAt: null)

  // Error handling: Only infrastructure-level errors may be thrown
}
