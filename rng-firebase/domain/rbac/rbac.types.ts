/**
 * Repository Contract Notes (applies to all IRepository<T> implementations)
 *
 * - Soft delete: Entities may be soft-deleted; soft-deleted entities must not be returned by default queries.
 * - Read-your-writes: All repository operations must guarantee read-your-writes consistency for the current session.
 * - Ordering: No ordering is guaranteed unless explicitly specified in the query contract.
 */
// RBAC domain types for Phase 2

import type { BaseEntity } from '../../abstract-client-repository/types';
import type { Assignment as CanonicalAssignment } from '../assignment/contract';
import type { Role } from './role';

/**
 * RolePermissions contract
 * - Defines feature-level permissions only (no resource-level permissions)
 * - Never allows owner-only actions for non-owners
 * - Managers ≠ owners; managers have a restricted allowlist
 */
export interface RolePermissions extends BaseEntity {
  role: Role;
  feature: string;
  actions: string[];
}

// Canonical RBACInput definition
export type RBACInput = {
  userId: string;
  role: Role;
  feature: string;
  action: string;
  resourceId?: string;
};

// RBACDecision is now strictly typed
import type { RBACDenialReason } from './rbac.reasons';
export enum RBACAllowReason {
  OWNER_BYPASS = 'OWNER_BYPASS',
  ROLE_ALLOWED = 'ROLE_ALLOWED',
  ASSIGNMENT_ALLOWED = 'ASSIGNMENT_ALLOWED',
}
export type RBACDecision =
  | { allowed: true; reason: RBACAllowReason }
  | { allowed: false; reason: RBACDenialReason };

// Re-export canonical Assignment
export type Assignment = CanonicalAssignment;
