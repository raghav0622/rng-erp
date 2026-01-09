// Phase 0: ExecutionContext Contract
// Defines the ExecutionContext type and rules for the kernel.
import type { Role } from '../rbac/role';
import type { User } from '../user/contract';

/**
 * ExecutionContext contract
 *
 * Rules:
 * - Created centrally (never by app code)
 * - Deeply frozen (immutable)
 * - Never mutated
 * - Never created by app code
 * - Never passed manually into hooks
 *
 * GUARANTEES:
 * - user: Canonical user object, always sourced from kernel repository, never from UI or external input
 * - role: Derived strictly from user.role, never overridden or injected
 * - now: Kernel-trusted timestamp, set at context creation, never mutated
 * - Contexts are single-use and must be invalidated on:
 *   - role change
 *   - assignment change
 *   - user disable
 * - Old contexts MUST be considered unsafe and never reused
 * - No context may be reused or mutated after creation
 */
export type ExecutionContext = {
  user: User;
  role: Role;
  now: number;
};
