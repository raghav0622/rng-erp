'use client';

import type { AuthSession } from '../app-auth-service/app-auth.contracts';
import { appAuthService } from './internal/authService';

/**
 * Hook: get current session snapshot synchronously.
 * Returns the current session state without subscribing to changes.
 * Use this to read the session once without continuous updates.
 *
 * WARNING: Not reactive—does not re-render on session changes.
 * For REACTIVE access to session state, use useAuthSession() instead.
 *
 * WHEN TO USE:
 * - Initial session check in route guards
 * - One-time reads during component initialization
 * - Synchronous session access without subscriptions
 *
 * WHEN NOT TO USE:
 * - In render logic if you need reactive updates (use useAuthSession instead)
 * - For continuous monitoring of auth state (use useAuthSession instead)
 *
 * @returns Current AuthSession snapshot (one-time read, not reactive)
 */
export function useGetSessionSnapshot(): AuthSession {
  return appAuthService.getSessionSnapshot();
}
