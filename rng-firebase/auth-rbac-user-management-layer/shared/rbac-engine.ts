// RBAC v2 Engine (assignment-based, pure, deterministic)
import type { RBACInput, Role } from '../../types/erp-types';

export function evaluateRBAC(input: RBACInput): { allowed: boolean; reason: string } {
  const { role, resource, action, context } = input;
  // Owner: full access
  if (role === 'owner') return { allowed: true, reason: 'Owner has full access' };
  // Team/assignment-based rules
  if (resource === 'team') {
    if (action === 'create' || action === 'delete' || action === 'invite' || action === 'remove') {
      return role === ('owner' as Role)
        ? { allowed: true, reason: 'Owner can manage teams' }
        : { allowed: false, reason: 'Only owner can manage teams' };
    }
    if (action === 'assign') {
      if (role === 'manager' && context?.isAssigned) {
        return { allowed: true, reason: 'Manager can assign within team' };
      }
      return role === ('owner' as Role)
        ? { allowed: true, reason: 'Owner can assign users' }
        : { allowed: false, reason: 'Only owner or assigned manager can assign' };
    }
  }
  // Default: allow for manager/employee on non-team resources
  if (role === 'manager' || role === 'employee') {
    return { allowed: true, reason: 'Manager/employee allowed for non-team resource' };
  }
  // Client: restricted
  if (role === 'client') {
    return { allowed: false, reason: 'Client has no management permissions' };
  }
  return { allowed: false, reason: 'Unknown or forbidden' };
}
