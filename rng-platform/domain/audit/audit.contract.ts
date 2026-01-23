// AuditSink contract for kernel integration
export interface AuditSink {
  emit(event: AuditEvent): void;
}
// Audit Domain Contract
import type { BaseEntity } from 'rng-repository';

export interface AuditEvent extends BaseEntity {
  eventType: 'attempt' | 'deny' | 'success' | 'failure';
  actorId: string;
  role: string;
  feature: string;
  action: string;
  reason: string;
  timestamp: string;
  createdAt: Date;
  updatedAt: Date;
  targetId?: string;
  details?: Record<string, unknown>;
}
