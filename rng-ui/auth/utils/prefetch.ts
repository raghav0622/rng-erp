/**
 * React Query Prefetch Utilities for Auth Components
 *
 * Optimizes user experience by prefetching data before navigation.
 * Reduces perceived loading times for common user flows.
 *
 * @example
 * ```tsx
 * // Prefetch user detail before navigation
 * const handleUserClick = (userId: string) => {
 *   prefetchUserDetail(queryClient, userId);
 *   router.push(`/users/${userId}`);
 * };
 * ```
 */

import { appAuthService, authQueryKeys } from '@/rng-platform';
import { QueryClient } from '@tanstack/react-query';

/**
 * Prefetch user detail by ID
 */
export async function prefetchUserDetail(queryClient: QueryClient, userId: string) {
  await queryClient.prefetchQuery({
    queryKey: authQueryKeys.userDetail(userId),
    queryFn: () => appAuthService.getUserById(userId),
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
  });
}

/**
 * Prefetch current user data
 */
export async function prefetchCurrentUser(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: authQueryKeys.currentUser(),
    queryFn: () => appAuthService.getCurrentUser(),
    staleTime: 60 * 1000, // Consider fresh for 1 minute
  });
}

/**
 * Prefetch user list
 */
export async function prefetchUserList(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: authQueryKeys.usersList(),
    queryFn: () => appAuthService.listUsers(),
    staleTime: 30 * 1000,
  });
}

/**
 * Prefetch user by email
 */
export async function prefetchUserByEmail(queryClient: QueryClient, email: string) {
  await queryClient.prefetchQuery({
    queryKey: authQueryKeys.userByEmail(email),
    queryFn: () => appAuthService.getUserByEmail(email),
    staleTime: 30 * 1000,
  });
}

/**
 * Prefetch owner bootstrap status
 */
export async function prefetchOwnerBootstrap(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: authQueryKeys.isOwnerBootstrapped(),
    queryFn: () => appAuthService.isOwnerBootstrapped(),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes (rarely changes)
  });
}

/**
 * Prefetch multiple users by IDs (batch)
 */
export async function prefetchUsersById(queryClient: QueryClient, userIds: string[]) {
  await Promise.all(
    userIds.map((userId) =>
      queryClient.prefetchQuery({
        queryKey: authQueryKeys.userDetail(userId),
        queryFn: () => appAuthService.getUserById(userId),
        staleTime: 30 * 1000,
      }),
    ),
  );
}

/**
 * Prefetch common dashboard data (current user + user list)
 */
export async function prefetchDashboardData(queryClient: QueryClient) {
  await Promise.all([prefetchCurrentUser(queryClient), prefetchUserList(queryClient)]);
}

/**
 * Prefetch data for user directory page
 */
export async function prefetchUserDirectoryData(queryClient: QueryClient) {
  await Promise.all([prefetchCurrentUser(queryClient), prefetchUserList(queryClient)]);
}

/**
 * Warm cache on app boot
 * Call this on app mount to preload critical data
 */
export async function warmAuthCache(queryClient: QueryClient) {
  // Only prefetch lightweight, frequently accessed data
  await Promise.all([prefetchCurrentUser(queryClient), prefetchOwnerBootstrap(queryClient)]);
}
