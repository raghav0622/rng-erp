'use client';

import { useSyncExternalStore } from 'react';
import type { AuthSession } from '../app-auth-service/app-auth.contracts';
import { appAuthService } from './internal/authService';

/**
 * Hook to access the current auth session state reactively.
 * Uses useSyncExternalStore to subscribe to appAuthService.onAuthStateChanged observable.
 * Safe for Suspense (does not throw).
 * Returns the current session immediately without waiting for server.
 *
 * Use this for REACTIVE access to session state. Component re-renders when session changes.
 * For one-time reads without subscriptions, use useGetSessionSnapshot().
 *
 * @returns Current AuthSession with reactive updates
 */
export function useAuthSession(): AuthSession {
  return useSyncExternalStore(
    (callback) => appAuthService.onAuthStateChanged(callback),
    () => appAuthService.getSessionSnapshot(),
    () => appAuthService.getSessionSnapshot(), // SSR snapshot
  );
}
