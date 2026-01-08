// ExecutionContext for ERP (deeply frozen, never mutated)
import type { Role, User } from '../../types/erp-types';

export type ExecutionContext = Readonly<{
  user: User;
  role: Role;
  now: number;
}>;

export function createExecutionContext(user: User, now: number): ExecutionContext {
  const ctx = { user, role: user.role, now };
  return Object.freeze(ctx);
}
