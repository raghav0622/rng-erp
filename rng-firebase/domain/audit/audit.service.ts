// AuditService for kernel: enforces canonical event types, invariants, and RBAC-protected reads
import type { AuditRepository } from '../../repositories/audit.repository';
import { RBACForbiddenError } from '../rbac/rbac.errors';
import { assertAuditEventValid } from './audit.invariants';
import type { AuditEventType, CanonicalAuditEvent } from './audit.types';

export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async record(event: CanonicalAuditEvent): Promise<void> {
    assertAuditEventValid(event);
    await this.repo.record(event);
  }

  async query(params: {
    actor?: string;
    type?: AuditEventType;
    target?: string;
    limit?: number;
    after?: number;
    rbacAllowed: boolean;
  }): Promise<CanonicalAuditEvent[]> {
    if (!params.rbacAllowed) throw new RBACForbiddenError('RBAC denied for audit read');
    // Enforce invariants on reads if needed
    const events = await this.repo.query(params);
    events.forEach(assertAuditEventValid);
    return events;
  }
}
