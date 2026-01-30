/**
 * React Query cache keys for auth hooks.
 * Hierarchical structure for efficient invalidation.
 */

export const authQueryKeys = {
  all: ['auth'] as const,

  // Session & state
  session: () => [...authQueryKeys.all, 'session'] as const,
  sessionSnapshot: () => [...authQueryKeys.session(), 'snapshot'] as const,

  // Current user
  currentUser: () => [...authQueryKeys.all, 'currentUser'] as const,

  // User queries
  users: () => [...authQueryKeys.all, 'users'] as const,
  usersList: () => [...authQueryKeys.users(), 'list'] as const,
  userDetail: (userId: string) => [...authQueryKeys.users(), 'detail', userId] as const,
  userByEmail: (email: string) => [...authQueryKeys.users(), 'byEmail', email] as const,
  userSearch: (query: string) => [...authQueryKeys.users(), 'search', query] as const,
  usersPaginated: (pageSize?: number, pageToken?: string) =>
    [...authQueryKeys.users(), 'paginated', pageSize, pageToken] as const,

  // Orphaned users (maintenance)
  orphanedUsers: () => [...authQueryKeys.all, 'orphaned'] as const,

  // Bootstrap & signup state
  bootstrap: () => [...authQueryKeys.all, 'bootstrap'] as const,
  isOwnerBootstrapped: () => [...authQueryKeys.bootstrap(), 'isOwnerBootstrapped'] as const,
  isSignupAllowed: () => [...authQueryKeys.bootstrap(), 'isSignupAllowed'] as const,
  isSignupComplete: () => [...authQueryKeys.bootstrap(), 'isSignupComplete'] as const,

  // Auth errors
  lastAuthError: () => [...authQueryKeys.all, 'lastAuthError'] as const,
  lastSessionTransitionError: () => [...authQueryKeys.all, 'lastSessionTransitionError'] as const,
} as const;
