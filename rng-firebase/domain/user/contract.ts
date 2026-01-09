// Phase 0: User Domain Contract
// Defines the canonical User type and invariants for the kernel.

/**
 * User domain contract (canonical)
 *
 * Invariants:
 * - Exactly one role per user
 * - No embedded permissions
 * - No team or scope coupling
 * - Lifecycle (authoritative), isEmailVerified is a flag only
 * - User.lifecycle is explicit and governs all access
 * - User.source is either 'bootstrap' or 'invite'
 * - Clients are read-only by default
 * - Clients cannot receive assignments
 * - Clients cannot be invited as managers/employees
 */
import type { BaseEntity } from '../../abstract-client-repository/types';
import type { Role } from '../rbac/role';

export type UserLifecycle = 'invited' | 'active' | 'disabled';
export type UserSource = 'bootstrap' | 'invite';

export interface User extends BaseEntity {
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  isEmailVerified: boolean;
  // isActive is replaced by lifecycle
  lifecycle: UserLifecycle;
  source: UserSource;
}
