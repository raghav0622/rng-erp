import type { AppUser } from '@/rng-platform/rng-auth';

/**
 * Create a test fixture for an Owner user
 */
export function createOwnerFixture(overrides?: Partial<AppUser>): AppUser {
  const now = new Date();
  return {
    id: 'owner-fixture-id',
    email: 'owner@example.com',
    name: 'Test Owner',
    role: 'owner',
    roleCategory: 'internal',
    inviteStatus: 'activated',
    isRegisteredOnERP: true,
    emailVerified: true,
    isDisabled: false,
    photoUrl: null,
    roleUpdatedAt: now,
    roleCategoryUpdatedAt: now,
    inviteRespondedAt: now,
    createdAt: now,
    updatedAt: now,
    _v: 1,
    ...overrides,
  };
}

/**
 * Create a test fixture for an invited user (not yet registered)
 */
export function createInvitedUserFixture(overrides?: Partial<AppUser>): AppUser {
  const now = new Date();
  return {
    id: 'invite-fixture-id',
    email: 'invited@example.com',
    name: 'Invited User',
    role: 'employee',
    roleCategory: 'internal',
    inviteStatus: 'invited',
    isRegisteredOnERP: false,
    emailVerified: false,
    isDisabled: false,
    photoUrl: null,
    roleUpdatedAt: now,
    roleCategoryUpdatedAt: now,
    inviteSentAt: now,
    createdAt: now,
    updatedAt: now,
    _v: 1,
    ...overrides,
  };
}

/**
 * Create a test fixture for an active registered user
 */
export function createActiveUserFixture(overrides?: Partial<AppUser>): AppUser {
  const now = new Date();
  return {
    id: 'active-fixture-id',
    email: 'active@example.com',
    name: 'Active User',
    role: 'employee',
    roleCategory: 'internal',
    inviteStatus: 'activated',
    isRegisteredOnERP: true,
    emailVerified: false,
    isDisabled: false,
    photoUrl: null,
    roleUpdatedAt: now,
    roleCategoryUpdatedAt: now,
    inviteRespondedAt: now,
    createdAt: now,
    updatedAt: now,
    _v: 1,
    ...overrides,
  };
}

/**
 * Create a test fixture for a disabled user
 */
export function createDisabledUserFixture(overrides?: Partial<AppUser>): AppUser {
  return createActiveUserFixture({
    isDisabled: true,
    ...overrides,
  });
}

/**
 * Create a test fixture for a revoked invitation
 */
export function createRevokedInviteFixture(overrides?: Partial<AppUser>): AppUser {
  return createInvitedUserFixture({
    inviteStatus: 'revoked',
    ...overrides,
  });
}

/**
 * Create a test fixture for a manager user
 */
export function createManagerFixture(overrides?: Partial<AppUser>): AppUser {
  return createActiveUserFixture({
    role: 'manager',
    email: 'manager@example.com',
    name: 'Test Manager',
    ...overrides,
  });
}

/**
 * Create a test fixture for a client user
 */
export function createClientFixture(overrides?: Partial<AppUser>): AppUser {
  return createActiveUserFixture({
    role: 'client',
    roleCategory: 'client',
    email: 'client@example.com',
    name: 'Test Client',
    ...overrides,
  });
}
