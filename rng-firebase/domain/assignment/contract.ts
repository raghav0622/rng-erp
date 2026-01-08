// Phase 0: Assignment Domain Contract
// Defines the Assignment type and invariants for the kernel.

/**
 * Assignment domain contract
 *
 * Invariants:
 * - Assignments are optional for owners
 * - Required for employees
 * - Managers may have partial implicit access
 * - Permissions are opaque strings
 * - No role duplication
 */
import type { BaseEntity } from '../../abstract-client-repository/types';

export interface Assignment extends BaseEntity {
  userId: string;
  feature: string;
  resourceId?: string;
  permissions: string[];
}
