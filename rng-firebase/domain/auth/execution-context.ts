// ExecutionContext Contract (Phase 1)
// Defines the ExecutionContext type and invariants for the kernel.
import type { Role } from '../rbac/role';
import type { User } from '../user/contract';

/**
 * ExecutionContext contract
 *
 * Rules:
 * - Created ONLY by ExecutionContextService (never by app or feature code)
 * - Deeply frozen (immutable, Object.freeze)
 * - Never mutated after creation
 * - Never created by app code
 * - Never passed manually into hooks
 * - Carries a context epoch (authEpoch) for invalidation
 *
 * GUARANTEES:
 * - user: Canonical user object, always sourced from kernel repository, never from UI or external input
 * - role: Derived strictly from user.role, never overridden or injected
 * - now: Kernel-trusted timestamp, set at context creation, never mutated
 * - authEpoch: Context version, used to detect staleness
 * - Contexts are single-use and must be invalidated on:
 *   - user.lifecycle change
 *   - user.role change
 *   - assignment change
 *   - user disable
 *   - signOut
 * - Old contexts MUST be considered unsafe and never reused
 * - No context may be reused or mutated after creation
 * - All validation and creation logic is enforced in ExecutionContextService
 */
export type ExecutionContext = {
  user: User;
  role: Role;
  now: number;
  authEpoch: number;
};
