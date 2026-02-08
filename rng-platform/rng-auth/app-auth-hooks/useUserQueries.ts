'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import type { AppUser } from '../app-auth-service/internal-app-user-service/app-user.contracts';
import { appAuthService } from './internal/authService';
import { authQueryKeys } from './keys';

/**
 * Query hook: fetch current authenticated user.
 * Throws AppAuthError if unable to fetch.
 * Suspends if no cached data.
 *
 * @returns { data: AppUser | null }
 *
 * **Return Semantics:**
 * - `data` is `null` if user is **not authenticated** or has a deleted account (NOT an error)
 * - `data` is an `AppUser` object if user is authenticated and exists
 * - Throws `AppAuthError` if fetch fails (network, service errors)
 *
 * **Important:** Null is a normal state, not exceptional. Use it to determine UI state:
 * ```tsx
 * const { data: user } = useCurrentUser();
 * if (user) {
 *   return <Dashboard user={user} />;
 * }
 * return <LoginPrompt />;
 * ```
 * Do NOT treat null as an error requiring an error boundary.
 *
 * **Cross-device status updates:**
 * - Polls every 5 seconds to detect if user has been disabled by owner on another device
 * - Works with background session timer that checks Firestore for disabled status
 * - Ensures disabled users are logged out within 5 seconds across all devices
 */
export function useCurrentUser() {
  return useSuspenseQuery({
    queryKey: authQueryKeys.currentUser(),
    queryFn: () => appAuthService.getCurrentUser(),
    refetchInterval: 5000, // Poll every 5 seconds to detect disabled status changes
    refetchOnWindowFocus: true, // Also check when user returns to tab
  });
}

/**
 * Query hook: fetch user by ID.
 * Throws AppAuthError if unable to fetch.
 * Suspends if no cached data.
 */
export function useGetUserById(userId: string) {
  return useSuspenseQuery({
    queryKey: authQueryKeys.userDetail(userId),
    queryFn: () => appAuthService.getUserById(userId),
  });
}

/**
 * Query hook: fetch user by email.
 * Throws AppAuthError if unable to fetch.
 * Suspends if no cached data.
 */
export function useGetUserByEmail(email: string) {
  return useSuspenseQuery({
    queryKey: authQueryKeys.userByEmail(email),
    queryFn: () => appAuthService.getUserByEmail(email),
  });
}

/**
 * Query hook: list all users.
 * Throws AppAuthError if unable to fetch.
 * Suspends if no cached data.
 *
 * No background polling - use manual refetch when updates are needed.
 */
export function useListUsers() {
  return useSuspenseQuery({
    queryKey: authQueryKeys.usersList(),
    queryFn: () => appAuthService.listUsers(),
  });
}

/**
 * Query hook: paginated user list.
 * Throws AppAuthError if unable to fetch.
 * Suspends if no cached data.
 *
 * No background polling - use manual refetch when updates are needed.
 *
 * @param pageSize - Number of items per page (must be > 0)
 * @param pageToken - Cursor for pagination (from previous response)
 * @throws AppAuthError if pageSize is invalid or service error occurs
 */
export function useListUsersPaginated(pageSize: number, pageToken?: string) {
  return useSuspenseQuery({
    queryKey: authQueryKeys.usersPaginated(pageSize, pageToken),
    queryFn: () => appAuthService.listUsersPaginated(pageSize, pageToken),
  });
}

/**
 * Query hook: search users by partial query object.
 * Throws AppAuthError if unable to fetch.
 * Suspends if no cached data.
 *
 * No background polling - use manual refetch when updates are needed.
 *
 * @param query - Partial AppUser object for filtering. Empty {} returns results based on service behavior.
 * @returns Promise<{ results: AppUser[]; truncated: boolean }>
 *   - results: Array of matching users
 *   - truncated: true if more results exist beyond this set
 * @throws AppAuthError if service error occurs
 */
export function useSearchUsers(query?: Partial<AppUser>) {
  // Canonicalize query key: sort keys to ensure consistent cache keys regardless of input order
  const queryKey = JSON.stringify(
    Object.keys(query || {})
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = (query as any)[key];
          return acc;
        },
        {} as Record<string, unknown>,
      ),
  );
  return useSuspenseQuery({
    queryKey: authQueryKeys.userSearch(queryKey),
    queryFn: async () => {
      return appAuthService.searchUsers(query || {});
    },
  });
}

/**
 * Query hook: list orphaned linked users (maintenance API).
 * Throws AppAuthError if unable to fetch or not authorized.
 * Suspends if no cached data.
 *
 * No background polling - manual refetch recommended after cleanup operations.
 */
export function useListOrphanedUsers() {
  return useSuspenseQuery({
    queryKey: authQueryKeys.orphanedUsers(),
    queryFn: () => appAuthService.listOrphanedLinkedUsers(),
  });
}
