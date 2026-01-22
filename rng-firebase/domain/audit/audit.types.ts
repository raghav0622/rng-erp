// Canonical audit event types for kernel
export enum AuditEventType {
  USER_SIGNIN = 'USER_SIGNIN',
  USER_SIGNOUT = 'USER_SIGNOUT',
  USER_INVITED = 'USER_INVITED',
  USER_CREATED = 'USER_CREATED',
  USER_DISABLED = 'USER_DISABLED',
  USER_EMAIL_UNVERIFIED = 'USER_EMAIL_UNVERIFIED',
  ASSIGNMENT_CREATED = 'ASSIGNMENT_CREATED',
  ASSIGNMENT_REVOKED = 'ASSIGNMENT_REVOKED',
  RBAC_DENIED = 'RBAC_DENIED',
  RBAC_GRANTED = 'RBAC_GRANTED',
  TAXONOMY_UPDATED = 'TAXONOMY_UPDATED',
  FEATURE_EXECUTED = 'FEATURE_EXECUTED',
  FEATURE_FAILED = 'FEATURE_FAILED',
  EXECUTION_CONTEXT_INVALIDATED = 'EXECUTION_CONTEXT_INVALIDATED',
  OWNER_BOOTSTRAP = 'OWNER_BOOTSTRAP',
  // Add more as needed
}

export type CanonicalAuditEvent = {
  type: AuditEventType;
  actor: string; // userId or system
  target?: string; // userId, resourceId, etc
  reason?: string;
  timestamp: number;
  details?: Record<string, unknown>;
};
