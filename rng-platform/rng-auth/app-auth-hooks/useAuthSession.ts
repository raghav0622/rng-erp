'use client';

import { useEffect, useState } from 'react';
import type { AuthSession } from '../app-auth-service/app-auth.contracts';
import { appAuthService } from './internal/authService';

/**
 * Hook to access the current auth session state reactively.
 * Subscribes to appAuthService.onAuthStateChanged observable.
 * Returns the current session immediately from snapshot.
 *
 * Use this for REACTIVE access to session state. Component re-renders when session changes.
 * For one-time reads without subscriptions, use useGetSessionSnapshot().
 *
 * @returns Current AuthSession with reactive updates
 */
export function useAuthSession(): AuthSession {
  // Initialize with current snapshot from service
  const [session, setSession] = useState<AuthSession>(() => appAuthService.getSessionSnapshot());

  useEffect(() => {
    // Subscribe to auth state changes
    // Note: onAuthStateChanged does NOT call immediately - the hook gets initial state
    // from getSessionSnapshot() above. This prevents Firestore consistency issues after mutations.
    const unsubscribe = appAuthService.onAuthStateChanged((newSession) => {
      setSession(newSession);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  return session;
}
