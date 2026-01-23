// Audit Domain Service Interface
export interface AuditService {
  emitEvent(event: import('./audit.contract').AuditEvent): Promise<void>;
  getEventsForActor(actorId: string): Promise<import('./audit.contract').AuditEvent[]>;
}
