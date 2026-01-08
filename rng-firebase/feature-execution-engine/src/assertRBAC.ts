import { ForbiddenError } from '../../abstract-client-repository/errors';
import type { ExecutionContext } from '../../auth-rbac-user-management-layer/shared/execution-context';
import { evaluateRBAC } from '../../auth-rbac-user-management-layer/shared/rbac-engine';

export function assertRBAC(
  def: {
    feature: string;
    action: string;
    permissions?: true;
    context?: { teamId?: string; isAssigned?: boolean };
  },
  ctx: ExecutionContext,
): void {
  if (!def.permissions) return;
  const result = evaluateRBAC({
    role: ctx.role,
    resource: def.feature,
    action: def.action,
    context: def.context ?? undefined,
  });
  if (!result.allowed) throw new ForbiddenError();
}
