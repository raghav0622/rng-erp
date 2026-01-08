// Minimal ExecutionContext type inlined to avoid import error
export interface ExecutionContext {
  user: { id: string; email?: string } | null;
  role: string | null;
  teamId?: string;
  isAssigned?: boolean;
}

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
