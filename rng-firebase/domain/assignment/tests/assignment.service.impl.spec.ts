import { beforeAll, describe, expect, it } from 'vitest';
import { initializeFeatureRegistry } from '../../feature/feature.registry';
import { AssignmentServiceImpl } from '../assignment.service.impl';

import type { AssignmentRepository } from '../../../repositories/assignment.repository';
import type { RoleRepository } from '../../../repositories/role.repository';
import type { UserRepository } from '../../../repositories/user.repository';
import type { RolePermissions } from '../../rbac/rbac.types';
import type { User } from '../../user/contract';
import type { AssignmentScope } from '../contract';

import { RepositoryError, RepositoryErrorCode } from '../../../abstract-client-repository/errors';
const mockAssignmentRepo = (): AssignmentRepository => {
  let assignments: any[] = [];
  // Import compareAssignmentScope from assignment.invariants
  const { compareAssignmentScope } = require('../assignment.invariants');
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
          compareAssignmentScope(a.scope, scope),
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
    ensureAssignmentUnique: async (userId, feature, action, scope) => {
      const duplicate = assignments.find(
        (a) =>
          a.userId === userId &&
          a.feature === feature &&
          a.action === action &&
          compareAssignmentScope(a.scope, scope),
      );
      if (duplicate) {
        throw new RepositoryError('Duplicate assignment', RepositoryErrorCode.FAILED_PRECONDITION);
      }
    },
    touch: async () => {},
    assertNotDeleted: async () => {},
    runAtomic: async (id: string) => assignments.find((a) => a.id === id) || ({} as any),
    createMany: async () => ({ successCount: 0, failureCount: 0, results: [] }),
    diff: () => ({}),
  };
};

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

describe('AssignmentServiceImpl', () => {
  beforeAll(() => {
    // Initialize the feature registry for all tests
    initializeFeatureRegistry([{ feature: 'f', actions: ['a', 'b'] }]);
  });
  it('should create assignment if unique', async () => {
    const repo = mockAssignmentRepo();
    const userRepo = mockUserRepo([
      {
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
      },
    ]);
    const rolePerm = {
      id: 'role1',
      role: 'employee',
      feature: 'f',
      actions: ['a', 'b'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const roleRepo = mockRoleRepo([rolePerm as any]);
    const service = new AssignmentServiceImpl(repo, userRepo, roleRepo);
    await service.createAssignment({
      userId: 'u1',
      feature: 'f',
      action: 'a',
      scope: { type: 'feature' },
    });
    expect((await repo.getAllByUserId('u1')).length).toBe(1);
  });

  it('should throw on duplicate assignment (same scope)', async () => {
    const repo = mockAssignmentRepo();
    const userRepo = mockUserRepo([
      {
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
      },
    ]);
    const rolePerm = {
      id: 'role1',
      role: 'employee',
      feature: 'f',
      actions: ['a', 'b'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const roleRepo = mockRoleRepo([rolePerm as any]);
    const service = new AssignmentServiceImpl(repo, userRepo, roleRepo);
    await service.createAssignment({
      userId: 'u1',
      feature: 'f',
      action: 'a',
      scope: { type: 'feature' },
    });
    await expect(
      service.createAssignment({
        userId: 'u1',
        feature: 'f',
        action: 'a',
        scope: { type: 'feature' },
      }),
    ).rejects.toThrowError(
      expect.objectContaining({ code: RepositoryErrorCode.FAILED_PRECONDITION }),
    );
  });

  it('should allow assignments with different scopes', async () => {
    const repo = mockAssignmentRepo();
    const userRepo = mockUserRepo([
      {
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
      },
    ]);
    const rolePerm = {
      id: 'role1',
      role: 'employee',
      feature: 'f',
      actions: ['a', 'b'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const roleRepo = mockRoleRepo([rolePerm as any]);
    const service = new AssignmentServiceImpl(repo, userRepo, roleRepo);
    await service.createAssignment({
      userId: 'u1',
      feature: 'f',
      action: 'a',
      scope: { type: 'feature' },
    });
    await service.createAssignment({
      userId: 'u1',
      feature: 'f',
      action: 'a',
      scope: { type: 'resource', resourceId: 'r1' },
    });
    expect((await repo.getAllByUserId('u1')).length).toBe(2);
  });
});
