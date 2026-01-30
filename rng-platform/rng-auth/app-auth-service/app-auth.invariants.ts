/**
 * AppAuthService invariants (client-side). See AUTH_MODEL.md and SESSION_MODEL.md.
 */

import { InternalAuthError, NotAuthenticatedError } from './app-auth.errors';
import { AppUser } from './internal-app-user-service/app-user.contracts';

/**
 * Enforces: authenticated ⇒ AppUser exists (no orphans).
 * See AUTH_MODEL.md and CLIENT_SIDE_LIMITATIONS.md.
 */
export function assertNoOrphanAuthUser(authUserExists: boolean, appUser: AppUser | null): void {
  if (authUserExists && !appUser) {
    throw new InternalAuthError();
  }
}

/**
 * Throws if the AppUser is not present (does not assert Firebase auth/session validity).
 */
export function assertAuthenticatedUser(user: AppUser | null | undefined): asserts user is AppUser {
  if (!user) throw new NotAuthenticatedError();
}

// Canonical invite lifecycle rules live in app-user.invariants.ts. Do not add or use invite lifecycle checks here.

// Email verification authority. See AUTH_MODEL.md.
