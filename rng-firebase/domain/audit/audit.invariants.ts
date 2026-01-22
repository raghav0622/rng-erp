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
  if (!event.actor || event.actor.trim() === '')
    throw new AuditInvariantViolationError('Missing or empty audit event actor');
  if (!event.timestamp) throw new AuditInvariantViolationError('Missing audit event timestamp');
  // Timestamp must be monotonic (greater than zero)
  if (typeof event.timestamp !== 'number' || event.timestamp <= 0)
    throw new AuditInvariantViolationError('Invalid audit event timestamp');
  // System vs user actor rules
  if (event.actor === 'system') {
    // Only allow system actor for specific event types
    const allowedSystemEvents = [
      'EXECUTION_CONTEXT_INVALIDATED',
      'FEATURE_FAILED',
      'OWNER_BOOTSTRAP',
      // Add more as needed
    ];
    if (!allowedSystemEvents.includes(event.type)) {
      throw new AuditInvariantViolationError(
        `System actor not allowed for event type: ${event.type}`,
      );
    }
  } else {
    // For user actors, must not be 'system' and must be a non-empty string
    if (event.actor === '' || event.actor === 'system') {
      throw new AuditInvariantViolationError('Invalid user actor for audit event');
    }
  }
  // Forbidden event types per caller (example: only system can emit OWNER_BOOTSTRAP)
  if (event.type === 'OWNER_BOOTSTRAP' && event.actor !== 'system') {
    throw new AuditInvariantViolationError('OWNER_BOOTSTRAP event must be emitted by system actor');
  }
}
