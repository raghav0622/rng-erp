/**
 * @frozen v1
 *
 * INTERNAL PUBLIC CONTRACT
 * Auth-owned Firestore user projection.
 *
 * - Non-authoritative for permissions
 * - Soft-delete only
 * - No credentials
 * - RBAC is the source of truth
 *
 * Breaking changes require v2.
 * All invariants described in this contract are now strictly enforced at runtime in the service layer.
 */

import { BaseEntity } from '@/rng-repository';

/**
 * Supported user roles in the ERP system.
 * - owner: The initial superuser, has all permissions. Only one allowed.
 * - manager: Elevated permissions, can manage users and data.
 * - employee: Standard user, limited permissions.
 * - client: External or limited-access user.
 */
export type AppUserRole = 'owner' | 'manager' | 'employee' | 'client';

export type AppUserInviteStatus = 'invited' | 'activated' | 'revoked';
/**
 * Represents an application user in the ERP system.
 *
 * Note: Role and roleCategory are cached for UI; RBAC is the source of truth.
 * All invite and owner invariants are enforced at runtime.
 */
export interface AppUser extends BaseEntity {
  /** Full name of the user. */
  name: string;
  /**
   * Email address (mirrored from auth provider, not user-editable).
   */
  email: string;
  /**
   * Cached role for UI display. RBAC is authoritative.
   */
  role: AppUserRole;
  /** Optional category for the user's role (e.g., department). */
  roleCategory?: string;
  /** Last time the role was updated. */
  roleUpdatedAt: Date;
  /** Last time the role category was updated. */
  roleCategoryUpdatedAt?: Date;
  /** Optional profile photo URL. */
  photoUrl?: string;
  /** Whether the user's email is verified. */
  emailVerified: boolean;
  /** Whether the user is disabled (cannot sign in). */
  isDisabled: boolean;

  inviteStatus: AppUserInviteStatus;
  inviteSentAt?: Date;
  inviteRespondedAt?: Date;

  /** True if the user has completed ERP registration. */
  isRegisteredOnERP: boolean;
}

/**
 * Payload for creating a new user (by owner/admin only).
 */
export interface CreateAppUser {
  /** Auth provider UID (required for linking to auth record). */
  authUid: string;
  /** Full name. */
  name: string;
  /** Email address. */
  email: string;
  /** Role to assign. */
  role: AppUserRole;
  /** Optional role category. */
  roleCategory?: string;
  /** Optional profile photo URL. */
  photoUrl?: string;
}

/**
 * Payload for deleting a user.
 */
export interface DeleteAppUser {
  /** User ID to delete. */
  userId: string;
}

/**
 * Payload for updating user profile fields.
 */
export interface UpdateAppUserProfile {
  /** New name (optional). */
  name?: string;
  /** New photo URL (optional). */
  photoUrl?: string;
}

/**
 * Payload for updating a user's role or role category.
 */
export interface UpdateAppUserRole {
  /** New role. */
  role: AppUserRole;
  /** New role category (optional). */
  roleCategory?: string;
}

/**
 * Payload for updating a user's enabled/disabled status.
 */
export interface UpdateAppUserStatus {
  /** True to disable the user, false to enable. */
  isDisabled: boolean;
}

/**
 * Service interface for managing application users.
 *
 * Notes:
 * - Only the owner can create new users after bootstrap.
 * - Public signup is disabled after the first owner is created.
 * - No bulk invites; one user, one role.
 * All invariants described in this interface are enforced at runtime in the implementation.
 */
export interface IAppUserService {
  /**
   * Create a new user (admin/owner only).
   * @param data User creation payload
   * @returns The created user
   */
  createUser(data: CreateAppUser): Promise<AppUser>;

  /**
   * Update a user's profile fields.
   * @param userId User ID
   * @param data Profile update payload
   * @returns The updated user
   */
  updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser>;

  /**
   * Update a user's role or role category.
   * @param userId User ID
   * @param data Role update payload
   * @returns The updated user
   */
  updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser>;

  /**
   * Enable or disable a user account.
   * @param userId User ID
   * @param data Status update payload
   * @returns The updated user
   */
  updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser>;

  /**
   * Delete a user from the system.
   * @param data Delete payload
   */
  deleteUser(data: DeleteAppUser): Promise<void>;

  /**
   * Get a user by their unique ID.
   * @param userId User ID
   * @returns The user or null if not found
   */
  getUserById(userId: string): Promise<AppUser | null>;

  /**
   * List all users in the system.
   * @returns Array of users
   */
  listUsers(): Promise<AppUser[]>;

  /**
   * Get a user by their email address.
   * @param email Email address
   * @returns The user or null if not found
   */
  getUserByEmail(email: string): Promise<AppUser | null>;

  /**
   * Returns true if the owner account has been bootstrapped (first signup complete).
   * @returns True if owner exists
   */
  isOwnerBootstrapped(): Promise<boolean>;

  /**
   * Returns true if public signup is currently allowed (only before owner bootstrap).
   * @returns True if signup is allowed
   */
  isSignupAllowed(): Promise<boolean>;
}
