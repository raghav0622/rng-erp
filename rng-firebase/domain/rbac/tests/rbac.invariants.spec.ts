import { describe, expect, it } from 'vitest';
import { evaluateRBAC } from '../rbac.engine';
import { RBACDenialReason } from '../rbac.reasons';
import type { Assignment, RBACInput, RolePermissions } from '../rbac.types';
import { RBACAllowReason } from '../rbac.types';

describe('RBAC invariants', () => {
  const baseInput: RBACInput = {
    userId: 'u1',
    role: 'employee',
    feature: 'orders',
    action: 'edit',
    scope: { type: 'feature' },
  };
  const rolePermissions: RolePermissions = {
    id: 'rp1',
    createdAt: new Date(),
    updatedAt: new Date(),
    role: 'employee',
    feature: 'orders',
    actions: ['edit'],
  };
  const assignment: Assignment = {
    id: 'a1',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'u1',
    feature: 'orders',
    action: 'edit',
    scope: { type: 'feature' },
  };

  it('denies employee without assignment', () => {
    const result = evaluateRBAC(baseInput, rolePermissions, null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(RBACDenialReason.ASSIGNMENT_MISSING);
  });

  it('denies manager escalation (action not in allowlist)', () => {
    const input = { ...baseInput, role: 'manager' as const, action: 'delete' };
    const rp = { ...rolePermissions, role: 'manager' as const, actions: ['edit'] };
    const result = evaluateRBAC(input, rp, null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(RBACDenialReason.ROLE_FORBIDDEN);
  });

  it('denies client always', () => {
    const input = { ...baseInput, role: 'client' as const };
    const rp = { ...rolePermissions, role: 'client' as const };
    const result = evaluateRBAC(input, rp, null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(RBACDenialReason.CLIENT_RESTRICTED);
  });

  it('allows employee with assignment and role permission', () => {
    const result = evaluateRBAC(baseInput, rolePermissions, assignment);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe(RBACAllowReason.ASSIGNMENT_ALLOWED);
  });
});
