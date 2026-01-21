// Audit invariants for kernel
import type { CanonicalAuditEvent } from './audit.types';

export class AuditInvariantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditInvariantViolationError';
  }
}

export function assertAuditEventValid(event: CanonicalAuditEvent): void {
  if (!event.type) throw new AuditInvariantViolationError('Missing audit event type');
  if (!event.actor) throw new AuditInvariantViolationError('Missing audit event actor');
  if (!event.timestamp) throw new AuditInvariantViolationError('Missing audit event timestamp');
  // Add more invariants as needed
}
