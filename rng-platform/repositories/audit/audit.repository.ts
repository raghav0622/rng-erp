// Audit Repository (rng-repository extension)
// Firestore Indexes Required:
// 1. (actorId, timestamp)
// 2. (feature, action, timestamp)
// 3. (eventType, timestamp)

import { AbstractClientFirestoreRepository } from 'rng-repository';
import type { AuditEvent } from '../../domain/audit/audit.contract';

export class AuditRepository extends AbstractClientFirestoreRepository<AuditEvent> {
  // No business logic, no invariants, no RBAC, no auth logic

  // Append-only: create only, no update/delete except soft delete

  // Query audit events by actor (indexed, deterministic)
  async getByActor(actorId: string): Promise<AuditEvent[]> {
    const result = await this.find({
      where: [
        ['actorId', '==', actorId],
        ['deletedAt', '==', null],
      ],
      orderBy: [['timestamp', 'desc']],
    });
    return result.data;
  }

  // Query audit events by feature/action (indexed, deterministic)
  async getByFeatureAction(feature: string, action: string): Promise<AuditEvent[]> {
    const result = await this.find({
      where: [
        ['feature', '==', feature],
        ['action', '==', action],
        ['deletedAt', '==', null],
      ],
      orderBy: [['timestamp', 'desc']],
    });
    return result.data;
  }

  // Query audit events by eventType (indexed, deterministic)
  async getByEventType(eventType: string): Promise<AuditEvent[]> {
    const result = await this.find({
      where: [
        ['eventType', '==', eventType],
        ['deletedAt', '==', null],
      ],
      orderBy: [['timestamp', 'desc']],
    });
    return result.data;
  }

  // Soft delete is respected by all queries (deletedAt: null)

  // Error handling: Only infrastructure-level errors may be thrown
}
