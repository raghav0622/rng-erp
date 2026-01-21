// AuditRepository contract for kernel
import type { CanonicalAuditEvent } from '../domain/audit/audit.types';

export interface AuditRepository {
  record(event: CanonicalAuditEvent): Promise<void>;
  /**
   * Query audit events by actor, type, or target. RBAC-protected.
   */
  query(params: {
    actor?: string;
    type?: string;
    target?: string;
    limit?: number;
    after?: number;
  }): Promise<CanonicalAuditEvent[]>;
}
