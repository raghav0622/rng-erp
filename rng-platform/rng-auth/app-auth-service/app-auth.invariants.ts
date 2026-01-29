/**
 * ERP-grade authentication invariants for AppAuthService (client-side)
 * All invariants are pure, deterministic, and side-effect free.
 * Breaking changes require a new contract version.
 *
 * NOTE:
 * Auth invariants are defensive precondition checks only.
 * Canonical invite lifecycle rules live in app-user.invariants.ts.
 * NotOwnerError and NotSelfError both use code = 'auth/not-authorized'.
 * This is intentional for v1: UI can distinguish by class, logging uses code, analytics can bucket both.
 *
 * Session state transitions are documented in comments only.
 * See AUTH SESSION STATE TRANSITIONS in app-auth.contracts.ts for the canonical list.
 */

import { InternalAuthError, NotAuthenticatedError } from './app-auth.errors';
import { AppUser } from './internal-app-user-service/app-user.contracts';

/**
 * Throws if a Firebase Auth user exists but no AppUser exists (invalid state).
 *
 * Enforces: authenticated ⇒ AppUser exists (no orphans)
 *
 * NOTE: This invariant only checks the EXISTENCE relationship.
 * It does NOT enforce invite lifecycle state (inviteStatus, inviteRespondedAt),
 * registration state (isRegisteredOnERP), or activation state (isDisabled, emailVerified).
 * Those post-auth invariants are enforced separately by _resolveAuthenticatedUser().
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

// --- EMAIL VERIFICATION AUTHORITY ---
//
// CRITICAL: AppUser.emailVerified is a read-only projection of Firebase Auth.
// Firebase Auth is the authoritative source for email verification status.
//
// INVARIANT ENFORCEMENT:
// - AppAuthService._resolveAuthenticatedUser() is the ONLY place that syncs emailVerified
// - AppUserService MUST NEVER update emailVerified arbitrarily
// - Updates to emailVerified only happen during post-auth resolution
//
// This ensures a single source of truth and prevents drift between Firebase and Firestore.
