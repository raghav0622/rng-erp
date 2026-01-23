/**
 * Version: 1.0.0
 * Amendments:
 *   - Initial contract (2026-01-23)
 *   - All changes must be documented here with date and rationale.
 */
// User Domain Contract
// No implementation. No runtime logic.

import type { BaseEntity } from 'rng-repository';

/**
 * User contract covers all use cases and edge cases:
 * - Canonical fields: id, email, displayName, role, status, createdAt, updatedAt
 * - Status: 'active', 'inactive', 'suspended', 'pending', 'deleted'
 * - Allowed transitions:
 *   - pending → active (on approval)
 *   - active → suspended (on violation)
 *   - suspended → active (on reinstatement)
 *   - any → inactive (on deactivation)
 *   - any → deleted (on explicit deletion)
 * - Hard invariants:
 *   - User ID is unique and immutable
 *   - Role is single and global
 *   - No implicit status changes
 *   - No duplicate emails
 *   - No orphaned users (must always have a valid role)
 * - Forbidden states:
 *   - Multiple roles
 *   - Unexplained status changes
 *   - Duplicate user IDs or emails
 *   - Users with missing required fields
 * - Error expectations:
 *   - All errors are typed and explainable
 *   - No free-text errors
 *   - All edge cases (e.g., reactivation after deletion) must be handled deterministically
 */
export interface User extends BaseEntity {
  email: string;
  displayName: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended' | 'pending' | 'deleted';
}

/**
 * Allowed transitions:
 * - pending → active (on approval)
 * - active → suspended (on violation)
 * - suspended → active (on reinstatement)
 * - any → inactive (on deactivation)
 */

/**
 * Hard invariants:
 * - User ID is unique and immutable.
 * - Role is single and global.
 * - No implicit status changes.
 */

/**
 * Forbidden states:
 * - Multiple roles
 * - Unexplained status changes
 * - Duplicate user IDs
 */

/**
 * Error expectations:
 * - All errors are typed and explainable.
 * - No free-text errors.
 */
