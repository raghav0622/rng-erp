export interface ListUsersPaginatedResult {
  data: AppUser[];
  nextPageToken?: string;
}

/**
 * AppUser contract (client-side projection). See AUTH_MODEL.md.
 */

import { BaseEntity } from '@/rng-repository';

export type AppUserRole = 'owner' | 'manager' | 'employee' | 'client';

export type AppUserInviteStatus = 'invited' | 'activated' | 'revoked';
/**
 * Resend invite payload.
 */
export interface ResendInvite {
  userId: string;
}

/**
 * Revoke invite payload.
 */
export interface RevokeInvite {
  userId: string;
}

/**
 * AppUser projection (Firestore). See AUTH_MODEL.md.
 */
export interface AppUser extends BaseEntity {
  name: string;
  email: string;
  role: AppUserRole;
  roleCategory?: string;
  roleUpdatedAt: Date;
  roleCategoryUpdatedAt?: Date;
  photoUrl?: string;
  emailVerified: boolean;
  isDisabled: boolean;
  inviteStatus: AppUserInviteStatus;
  inviteSentAt?: Date;
  inviteRespondedAt?: Date;
  isRegisteredOnERP: boolean;
}
/**
 * Payload for creating an invited user (no authUid, Firestore-only invite).
 */
export interface CreateInvitedUser {
  /** Full name. */
  name: string;
  /** Email address. */
  email: string;
  /** Role to assign. */
  role: Exclude<AppUserRole, 'owner'>;
  /** Optional role category. */
  roleCategory?: string;
  /** Optional profile photo URL. */
  photoUrl?: string;
}
/**
 * Payload for creating the owner user (requires authUid, for bootstrap only).
 */
export interface CreateOwnerUser {
  /** Auth provider UID (required for linking to auth record). */
  authUid: string;
  /** Full name. */
  name: string;
  /** Email address. */
  email: string;
  /** Must be 'owner'. */
  role: 'owner';
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
 * AppUser service contract. See README.internal.md and INVITE_FLOW.md.
 */
export interface IAppUserService {
  /**
   * Restore a soft-deleted user.
   * @param userId User ID
   * @returns The restored user
   * @note Only the owner may restore users. This is enforced at the service layer.
   */
  restoreUser(userId: string): Promise<AppUser>;

  /**
   * Search users by indexed, allow-listed fields only (e.g., email, role, inviteStatus, isDisabled, isRegisteredOnERP).
   * Arbitrary field search is NOT supported due to Firestore limitations.
   * @param query Partial<AppUser> fields to match (must be allow-listed and indexed)
   * @returns Array of users matching query
   * @throws AppUserInvariantViolation if no valid query fields are provided
   */
  searchUsers(query: Partial<AppUser>): Promise<AppUser[]>;

  /**
   * Reactivate a previously disabled user.
   * @param userId User ID
   * @returns The reactivated user
   * @note Only the owner may reactivate users. This is enforced at the service layer.
   */
  reactivateUser(userId: string): Promise<AppUser>;
  /**
   * Resend an invite to a user (if inviteStatus is 'invited').
   */
  resendInvite(data: ResendInvite): Promise<AppUser>;

  /**
   * Revoke an invite (if inviteStatus is 'invited').
   */
  revokeInvite(data: RevokeInvite): Promise<AppUser>;
  /**
   * Create a new user (admin/owner only).
   * @param data User creation payload
   * @returns The created user
   */
  createUser(data: CreateOwnerUser | CreateInvitedUser): Promise<AppUser>;

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
   * @dangerous SOFT-DEPRECATED: List all users in the system.
   *
   * Unpaginated query that will eventually hit Firestore limits as the user base grows.
   * Suitable only for small deployments (< 1000 users).
   *
   * RECOMMENDED: Use listUsersPaginated() instead.
   *
   * @returns Array of users
   * @policy This exposes all users to any authenticated client. This is a policy decision.
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

  /**
   * List users with pagination.
   * @param pageSize Number of users per page
   * @param pageToken Opaque token for next page
   */
  listUsersPaginated(pageSize: number, pageToken?: string): Promise<ListUsersPaginatedResult>;

  /**
   * Permanently delete a user record (hard delete, not soft delete).
   * Only the owner may perform this operation.
   * @param userId User ID
   */
  deleteUserPermanently(userId: string): Promise<void>;
}
