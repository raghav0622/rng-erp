// Phase 0: RBAC Contracts (Pure)
// Defines RBACInput and RBACDecision types and invariants for the kernel.
import type { Role } from './role';

/**
 * RBACInput contract
 *
 * Invariants:
 * - RBAC is pure
 * - Deterministic
 * - Side-effect free
 * - No repositories
 * - No React
 * - No Firebase
 */
export type RBACInput = {
  userId: string;
  role: Role;
  feature: string;
  action: string;
  resourceId?: string;
};

/**
 * RBACDecision contract
 */
export type RBACDecision = {
  allowed: boolean;
  reason: string;
};
