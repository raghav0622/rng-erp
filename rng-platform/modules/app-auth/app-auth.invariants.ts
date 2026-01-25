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

import { AppUser } from '../app-user/app-user.contracts';
import {
  InternalAuthError,
  NotAuthenticatedError,
  OwnerAlreadyExistsError,
} from './app-auth.errors';

/**
 * Throws if a Firebase Auth user exists but no AppUser exists (invalid state).
 * Enforces: authenticated ⇒ AppUser exists
 */
export function assertNoOrphanAuthUser(authUserExists: boolean, appUser: AppUser | null): void {
  if (authUserExists && !appUser) {
    throw new InternalAuthError();
  }
}

/**
 * Throws if the owner account already exists.
 */
export function assertOwnerNotExists(ownerExists: boolean): void {
  if (ownerExists) throw new OwnerAlreadyExistsError();
}

/**
 * Throws if the AppUser is not present (does not assert Firebase auth/session validity).
 */
export function assertAuthenticatedUser(user: AppUser | null | undefined): asserts user is AppUser {
  if (!user) throw new NotAuthenticatedError();
}

// Canonical invite lifecycle rules live in app-user.invariants.ts. Do not add or use invite lifecycle checks here.

// Add more invariants as business rules evolve.
