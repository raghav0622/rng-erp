'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { appAuthService } from './internal/authService';
import { authQueryKeys } from './keys';

/**
 * Query hook: check if owner account is bootstrapped.
 * Suspends if no cached data.
 */
export function useIsOwnerBootstrapped() {
  return useSuspenseQuery({
    queryKey: authQueryKeys.isOwnerBootstrapped(),
    queryFn: () => appAuthService.isOwnerBootstrapped(),
  });
}

/**
 * Query hook: check if new user signup is allowed.
 * Suspends if no cached data.
 */
export function useIsSignupAllowed() {
  return useSuspenseQuery({
    queryKey: authQueryKeys.isSignupAllowed(),
    queryFn: () => appAuthService.isSignupAllowed(),
  });
}

/**
 * Hook: check if signup is complete (synchronous).
 * WARNING: Not reactive—does not re-render on state changes.
 * Use only in initialization logic or layouts that control auth flow.
 */
export function useIsSignupComplete(): boolean {
  return appAuthService.isSignupComplete();
}

/**
 * Hook: get last auth error that occurred (synchronous).
 * WARNING: Not reactive—returns stale value if auth state changes.
 * For reactive error handling, use error boundaries with useAuthSession().
 */
export function useGetLastAuthError() {
  return appAuthService.getLastAuthError();
}

/**
 * Hook: get last session state transition error (synchronous).
 * WARNING: Not reactive—returns stale value if auth state changes.
 * For reactive error handling, subscribe to useAuthSession() changes.
 */
export function useGetLastSessionTransitionError() {
  return appAuthService.getLastSessionTransitionError();
}
