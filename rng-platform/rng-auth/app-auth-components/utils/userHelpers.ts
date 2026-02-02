/**
 * User helper utilities for auth components
 * Provides user-related logic and transformations
 */

import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';

/**
 * Get user's full display name
 * @param user - AppUser object
 * @returns Full name or email or "Unknown User"
 */
export function getUserDisplayName(user: AppUser | null | undefined): string {
  if (!user) return 'Unknown User';
  return user.name || user.email || 'Unknown User';
}

/**
 * Get user's initials for avatar
 * @param user - AppUser object
 * @returns Initials (up to 2 characters)
 */
export function getUserInitials(user: AppUser | null | undefined): string {
  if (!user) return '?';

  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0];
      const second = parts[1];
      if (first && second) {
        const firstChar = first.charAt(0);
        const secondChar = second.charAt(0);
        return (firstChar + secondChar).toUpperCase();
      }
    }
    const first = parts[0];
    if (first) {
      return first.substring(0, 2).toUpperCase();
    }
  }

  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }

  return '?';
}

/**
 * Get user's status priority (for badge display)
 * Higher priority = more important status to show
 * @param user - AppUser object
 * @returns Priority number (higher = more important)
 */
export function getUserStatusPriority(user: AppUser | null | undefined): number {
  if (!user) return 0;

  // Priority order (highest to lowest):
  // 1. Deleted (most critical)
  // 2. Disabled
  // 3. Revoked invite
  // 4. Pending invite
  // 5. Active (default)

  if (user.deletedAt) return 5;
  if (user.isDisabled) return 4;
  if (user.inviteStatus === 'revoked') return 3;
  if (user.inviteStatus === 'invited') return 2;
  return 1; // Active
}

/**
 * Get user's primary status label
 * @param user - AppUser object
 * @returns Status label string
 */
export function getUserStatusLabel(user: AppUser | null | undefined): string {
  if (!user) return 'Unknown';

  if (user.deletedAt) return 'Deleted';
  if (user.isDisabled) return 'Disabled';
  if (user.inviteStatus === 'revoked') return 'Revoked';
  if (user.inviteStatus === 'invited') return 'Invited';
  return 'Active';
}

/**
 * Check if user is active (not deleted, not disabled, activated)
 * @param user - AppUser object
 * @returns True if user is active
 */
export function isUserActive(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return (
    !user.deletedAt &&
    !user.isDisabled &&
    user.inviteStatus === 'activated' &&
    user.isRegisteredOnERP
  );
}

/**
 * Check if user is pending invite acceptance
 * @param user - AppUser object
 * @returns True if user has pending invite
 */
export function isUserPendingInvite(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.inviteStatus === 'invited' && !user.deletedAt && !user.isDisabled;
}

/**
 * Check if user can be restored (soft-deleted)
 * @param user - AppUser object
 * @returns True if user can be restored
 */
export function canUserBeRestored(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return !!user.deletedAt && user.role !== 'owner';
}

/**
 * Check if user can be reactivated (disabled)
 * @param user - AppUser object
 * @returns True if user can be reactivated
 */
export function canUserBeReactivated(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.isDisabled && !user.deletedAt && user.role !== 'owner';
}

/**
 * Check if user has verified email
 * @param user - AppUser object
 * @returns True if email is verified
 */
export function hasVerifiedEmail(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  return user.emailVerified === true;
}

/**
 * Get user's profile photo URL or undefined
 * @param user - AppUser object
 * @returns Photo URL or undefined
 */
export function getUserPhotoUrl(user: AppUser | null | undefined): string | undefined {
  if (!user) return undefined;
  return user.photoUrl || undefined;
}

/**
 * Check if two users are the same
 * @param user1 - First user
 * @param user2 - Second user
 * @returns True if users have same ID
 */
export function isSameUser(
  user1: AppUser | null | undefined,
  user2: AppUser | null | undefined,
): boolean {
  if (!user1 || !user2) return false;
  return user1.id === user2.id;
}

/**
 * Sort users by name (alphabetically)
 * @param users - Array of users
 * @returns Sorted array
 */
export function sortUsersByName(users: AppUser[]): AppUser[] {
  return [...users].sort((a, b) => {
    const nameA = getUserDisplayName(a).toLowerCase();
    const nameB = getUserDisplayName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });
}

/**
 * Sort users by status priority (deleted first, active last)
 * @param users - Array of users
 * @returns Sorted array
 */
export function sortUsersByStatus(users: AppUser[]): AppUser[] {
  return [...users].sort((a, b) => {
    return getUserStatusPriority(b) - getUserStatusPriority(a);
  });
}

/**
 * Filter users by search query (name or email)
 * @param users - Array of users
 * @param query - Search query string
 * @returns Filtered array
 */
export function filterUsersBySearch(users: AppUser[], query: string): AppUser[] {
  if (!query.trim()) return users;

  const lowerQuery = query.toLowerCase().trim();
  return users.filter((user) => {
    const name = user.name?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    return name.includes(lowerQuery) || email.includes(lowerQuery);
  });
}
