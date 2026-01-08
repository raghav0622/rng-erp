// Audit log event writer (to be called from service hooks only)
import type { AuditEvent } from '../../types/erp-types';

export function writeAuditEvent(event: AuditEvent): void {
  // Implementation: enqueue or write to Firestore audit collection
  // (Stub: replace with actual Firestore logic in service hook layer)
  // Example: firestore.collection('audit').add(event)
  // For now, just a placeholder
  // throw new Error('Not implemented');
}
