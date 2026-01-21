import { describe, expect, it } from 'vitest';
import { AssignmentInvariantViolationError } from '../assignment.invariants';
import { AssignmentServiceImpl } from '../assignment.service.impl';

import type { AssignmentRepository } from '../../../repositories/assignment.repository';
import type { RoleRepository } from '../../../repositories/role.repository';
import type { UserRepository } from '../../../repositories/user.repository';
import type { RolePermissions } from '../../rbac/rbac.types';
import type { User } from '../../user/contract';
import type { AssignmentScope } from '../contract';
const mockUserRepo = (users: User[]): UserRepository => {
  return {
    findOne: async () => null,
    upsert: async () => ({
      id: 'upsert',
      email: '',
      displayName: '',
      role: 'employee',
      isEmailVerified: false,
      lifecycle: 'active',
      source: 'invite',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getById: async (id: string) => users.find((u) => u.id === id) || null,
    getByEmail: async (email: string) => users.find((u) => u.email === email) || null,
    count: async () => users.length,
    create: async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => ({
      ...user,
      id: user.id || 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      lifecycle: user.lifecycle,
      source: user.source,
    }),
    update: async (id: string, patch: Partial<User>) => {
      const userObj = users.find((u) => u.id === id);
      if (userObj) Object.assign(userObj, patch);
      return (
        userObj ||
        ({
          id,
          email: '',
          displayName: '',
          role: 'employee',
          isEmailVerified: false,
          lifecycle: 'active',
          source: 'invite',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User)
      );
    },
    createOwnerAtomically: async (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => ({
      ...user,
      id: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      lifecycle: user.lifecycle,
      source: user.source,
    }),
    getOptional: async (id: string) => users.find((u) => u.id === id) || null,
    find: async () => ({ data: users, nextCursor: undefined, hasMore: false }),
    delete: async () => {},
    softDelete: async () => {},
    restore: async () => ({
      id: 'restored',
      email: '',
      displayName: '',
      role: 'employee',
      isEmailVerified: false,
      lifecycle: 'active',
      source: 'invite',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    getMany: async (ids: string[]) => ids.map((id) => users.find((u) => u.id === id) || null),
    ensureExists: async () => {},
    ensureNotExists: async () => {},
    ensureUnique: async () => {},
    touch: async () => {},
    assertNotDeleted: async () => {},
    runAtomic: async () => ({
      id: 'atomic',
      email: '',
      displayName: '',
      role: 'employee',
      isEmailVerified: false,
      lifecycle: 'active',
      source: 'invite',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    createMany: async () => ({ successCount: 0, failureCount: 0, results: [] }),
    diff: () => ({}),
  };
};
const mockRoleRepo = (roles: RolePermissions[]): RoleRepository => {
  return {
    getByRoleAndFeature: async (role: string, feature: string) =>
      roles.find((r) => r.role === role && r.feature === feature) || null,
    getById: async () => null,
    getOptional: async () => null,
    find: async () => ({ data: roles, nextCursor: undefined, hasMore: false }),
    findOne: async () => null,
    count: async () => roles.length,
    create: async () => ({}) as any,
    update: async () => ({}) as any,
    upsert: async () => ({}) as any,
    delete: async () => {},
    softDelete: async () => {},
    restore: async () => ({}) as any,
    getMany: async () => [],
    ensureExists: async () => {},
    ensureNotExists: async () => {},
    ensureUnique: async () => {},
    touch: async () => {},
    assertNotDeleted: async () => {},
    runAtomic: async () => ({}) as any,
    createMany: async () => ({ successCount: 0, failureCount: 0, results: [] }),
    diff: () => ({}),
  };
};
const mockAssignmentRepo = (): AssignmentRepository => {
  let assignments: any[] = [];
  return {
    findOne: async () => null,
    count: async () => assignments.length,
    update: async () => ({}) as any,
    upsert: async () => ({}) as any,
    getAllByUserId: async (userId: string) => assignments.filter((a) => a.userId === userId),
    getByUserIdFeatureActionScope: async (
      userId: string,
      feature: string,
      action: string,
      scope: AssignmentScope,
    ) =>
      assignments.find(
        (a) =>
          a.userId === userId &&
          a.feature === feature &&
          a.action === action &&
          JSON.stringify(a.scope) === JSON.stringify(scope),
      ) || null,
    getById: async (id: string) => assignments.find((a) => a.id === id) || null,
    getOptional: async (id: string) => assignments.find((a) => a.id === id) || null,
    find: async () => ({ data: assignments, nextCursor: undefined, hasMore: false }),
    create: async (a: any) => {
      assignments.push(a);
      return a;
    },
    delete: async (id: string) => {
      assignments = assignments.filter((a) => a.id !== id);
    },
    softDelete: async () => {},
    restore: async (id: string) => assignments.find((a) => a.id === id) || ({} as any),
    getMany: async (ids: string[]) => ids.map((id) => assignments.find((a) => a.id === id) || null),
    ensureExists: async () => {},
    ensureNotExists: async () => {},
    ensureUnique: async () => {},
    touch: async () => {},
    assertNotDeleted: async () => {},
    runAtomic: async (id: string) => assignments.find((a) => a.id === id) || ({} as any),
    createMany: async () => ({ successCount: 0, failureCount: 0, results: [] }),
    diff: () => ({}),
  };
};

const user: User = {
  id: 'u1',
  email: 'u1@example.com',
  displayName: 'User One',
  photoURL: undefined,
  role: 'employee',
  isEmailVerified: true,
  lifecycle: 'active',
  source: 'invite',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const rolePerm: RolePermissions = {
  id: 'role1',
  role: 'employee',
  feature: 'f',
  actions: ['a', 'b'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AssignmentServiceImpl invariants', () => {
  it('throws if user does not exist', async () => {
    const service = new AssignmentServiceImpl(
      mockAssignmentRepo(),
      mockUserRepo([]),
      mockRoleRepo([rolePerm]),
    );
    await expect(
      service.createAssignment({
        userId: 'u1',
        feature: 'f',
        action: 'a',
        scope: { type: 'feature' },
      }),
    ).rejects.toThrow(AssignmentInvariantViolationError);
  });

  it('throws if user is client', async () => {
    const service = new AssignmentServiceImpl(
      mockAssignmentRepo(),
      mockUserRepo([{ ...user, role: 'client' }]),
      mockRoleRepo([rolePerm]),
    );
    await expect(
      service.createAssignment({
        userId: 'u1',
        feature: 'f',
        action: 'a',
        scope: { type: 'feature' },
      }),
    ).rejects.toThrow(AssignmentInvariantViolationError);
  });

  // Only test uniqueness, escalation prevention, client restriction here
});
