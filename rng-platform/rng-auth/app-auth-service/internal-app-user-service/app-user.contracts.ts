export interface ListUsersPaginatedResult {
  data: AppUser[];
  nextPageToken?: string;
}

/**
 * INTERNAL PUBLIC CONTRACT (Extensible)
 *
 * Auth-owned Firestore user projection.
 * - Not authoritative for permissions; see RBAC
 * - Soft-delete only
 * - No credentials
 * - RBAC is the source of truth
 *
 * This contract is extensible. Breaking changes require v2.
 * All invariants described here are strictly enforced at runtime in the service layer.
 *
 * Extension points: add new user fields, search/filter methods, or invariants as needed.
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
 * Note:
 * - AppUser is always a projection of the corresponding Firebase Auth user.
 * - Email is mirrored from Auth and is NOT updatable via AppUserService.
 * - Role and roleCategory are cached for UI; RBAC is the source of truth.
 * - All invite and owner invariants are enforced at runtime.
/**
 * Payload for resending an invite to a user.
 */
export interface ResendInvite {
  userId: string;
}

/**
 * Payload for revoking an invite.
 */
export interface RevokeInvite {
  userId: string;
}
export interface AppUser extends BaseEntity {
  /** Full name of the user. */
  name: string;
  /**
   * Email address (mirrored from auth provider, not user-editable).
   * This is intentionally exposed for user management and notifications.
   */
  email: string;
  /**
   * Cached role for UI display. RBAC is the source of truth for permissions.
   * Only the role field is exposed; permissions are enforced elsewhere.
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

  /**
   * Invite status for onboarding flows. Only exposed for invite lifecycle management.
   */
  inviteStatus: AppUserInviteStatus;
  /** Timestamp when invite was sent. */
  inviteSentAt?: Date;
  /** Timestamp when invite was responded to (activated). */
  inviteRespondedAt?: Date;

  /** True if the user has completed ERP registration. */
  isRegisteredOnERP: boolean;
}

/**
 * Payload for creating a new user (by owner/admin only).
 */
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
 * Service interface for managing application users.
 *
 * Notes:
 * - Only the owner can create new users after bootstrap.
 * - Public signup is disabled after the first owner is created.
 * - No bulk invites; one user, one role.
 * All invariants described in this interface are enforced at runtime in the implementation.
 *
 * ---
 *
 * USAGE EXAMPLES:
 *
 * // Create a new user (owner only)
 * await appUserService.createUser({ authUid, name, email, role: 'employee' });
 *
 * // Update user profile
 * await appUserService.updateUserProfile(userId, { name: 'New Name' });
 *
 * // Disable a user
 * await appUserService.updateUserStatus(userId, { isDisabled: true });
 *
 * // List users (with pagination)
 * const { data, nextPageToken } = await appUserService.listUsers({ pageSize: 20 });
 *
 * // Resend invite
 * await appUserService.resendInvite({ userId });
 *
 * // Revoke invite
 * await appUserService.revokeInvite({ userId });
 *
 * // Get user by email
 * const user = await appUserService.getUserByEmail('user@example.com');
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
