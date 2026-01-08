// Phase 0: User Domain Contract
// Defines the canonical User type and invariants for the kernel.

/**
 * User domain contract
 *
 * Invariants:
 * - Exactly one role per user
 * - No embedded permissions
 * - No team or scope coupling
 * - Lifecycle flags (isActive, isEmailVerified) are authoritative
 */
import type { BaseEntity } from '../../abstract-client-repository/types';
import type { Role } from '../rbac/role';

export interface User extends BaseEntity {
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  isEmailVerified: boolean;
  isActive: boolean;
}
