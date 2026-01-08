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
 */
export type ExecutionContext = {
  user: User;
  role: Role;
  now: number;
};
