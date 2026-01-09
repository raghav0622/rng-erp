// Phase 0: Assignment Domain Contract
// Defines the Assignment type and invariants for the kernel.

/**
 * Assignment domain contract (canonical)
 *
 * Invariants:
 * - Owners do not require assignments
 * - Employees require assignment for any write-class action
 * - Assignments may NEVER grant owner-only actions
 * - Assignments may NEVER override a denied role action
 * - Clients cannot receive assignments
 * - No duplicate assignments for same user/feature/action/resource
 *
 * Repository Contract Notes:
 * - Uniqueness: Repository must enforce uniqueness of (userId, feature, action, resourceId?)
 * - Read-your-writes: Repository must guarantee read-your-writes consistency
 * - Soft delete: Soft-deleted assignments must not be returned by default queries
 * - Deterministic lookup: All queries must be deterministic and side-effect free
 */
import type { BaseEntity } from '../../abstract-client-repository/types';

export interface Assignment extends BaseEntity {
  userId: string;
  feature: string;
  action: string;
  resourceId?: string;
}
