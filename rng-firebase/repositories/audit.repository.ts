// AuditRepository contract for audit event persistence
// All methods must be deterministic and typed

export type AuditEvent = {
  type: string;
  email?: string;
  reason?: string;
  timestamp: number;
};

export interface AuditRepository {
  record(event: AuditEvent): Promise<void>;
}
