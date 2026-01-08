import type { ExecutionContext } from './execution-context';
// evaluateRBAC and ForbiddenError must be provided by the application layer.

export function assertRBAC(
  def: {
    feature: string;
    action: string;
    permissions?: true;
    context?: { teamId?: string; isAssigned?: boolean };
  },
  ctx: ExecutionContext,
): void {
  throw new Error('assertRBAC must be implemented by the application.');
}
