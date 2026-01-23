// Assignment Scope (law-compliant)
export type AssignmentScope =
  | { type: 'feature' }
  | { type: 'resource'; resourceId: string }
  | { type: 'featureDoc'; docId: string };
// Assignment Domain Contract
// No implementation. No runtime logic.

import type { BaseEntity } from 'rng-repository';

/**
 * Assignment contract covers all use cases and edge cases:
 * - Canonical fields: id, userId, resource, role, status, createdAt, updatedAt
 * - Status: 'assigned', 'escalated', 'revoked', 'expired', 'pending', 'deleted'
 * - Allowed transitions:
 *   - assigned → escalated (on explicit escalation)
 *   - escalated → revoked (on explicit revocation)
 *   - assigned → revoked (on explicit revocation)
 *   - any → expired (on time or policy expiry)
 *   - any → deleted (on explicit deletion)
 *   - any → pending (on assignment request)
 * - Hard invariants:
 *   - Assignment escalation is explicit and explainable
 *   - No implicit escalation or revocation
 *   - All assignments are atomic and deterministic
 *   - No duplicate assignments for same user/resource/role
 *   - No orphaned assignments (must always have a valid user and resource)
 * - Forbidden states:
 *   - Implicit escalation
 *   - Multiple assignments for same user/resource/role
 *   - Unexplainable status changes
 *   - Assignments with missing required fields
 * - Error expectations:
 *   - All errors are typed and explainable
 *   - No free-text errors
 *   - All edge cases (e.g., re-assignment after revocation) must be handled deterministically
 */
export interface Assignment extends BaseEntity {
  userId: string;
  resource: string;
  role: string;
  status: 'assigned' | 'escalated' | 'revoked' | 'expired' | 'pending' | 'deleted';
}

/**
 * Allowed transitions:
 * - assigned → escalated (on explicit escalation)
 * - escalated → revoked (on explicit revocation)
 * - assigned → revoked (on explicit revocation)
 */

/**
 * Hard invariants:
 * - Assignment escalation is explicit and explainable.
 * - No implicit escalation or revocation.
 * - All assignments are atomic and deterministic.
 */

/**
 * Forbidden states:
 * - Implicit escalation
 * - Multiple assignments for same user/resource/role
 * - Unexplainable status changes
 */

/**
 * Error expectations:
 * - All errors are typed and explainable.
 * - No free-text errors.
 */
