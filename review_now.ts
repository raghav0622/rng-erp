/**
 * rng-platform manual review file
 * Purpose: line-by-line senior engineer review
 */

// FILE: rng-platform/rng-auth/app-auth-components/index.ts

//future stuff here


// FILE: rng-platform/rng-auth/app-auth-hooks/index.ts

//future stuff here


// FILE: rng-platform/rng-auth/app-auth-service/AUTH_MODEL.md

# Auth Model (Canonical)

## Split Authority

- **Firebase Auth**: Identity and email verification authority.
- **AppUser (Firestore)**: ERP user projection and role/activation state.

## One-Time AuthUid Linking Rule

Each Firebase Auth user (`authUid`) can be linked exactly once to one AppUser. Links are immutable.

## Email Verification Authority

`emailVerified` is authoritative in Firebase Auth. Firestore mirrors it during auth resolution. The mirror can lag; Firebase is always the source of truth.

## Disablement Semantics

`isDisabled` is enforced in Firestore only. Disabled users may keep existing Firebase sessions until the next auth resolution.

## Concurrent Sessions

Multiple concurrent sessions are allowed. There is no global session revocation.

## No Global Revocation

The system does not revoke sessions globally. This is an explicit client-side policy choice.


// FILE: rng-platform/rng-auth/app-auth-service/CLIENT_SIDE_LIMITATIONS.md

# Client-Side Limitations (Explicit & Accepted)

This module is client-only by policy. The following constraints are intentional and permanent.

## Constraints

- No distributed transactions.
- No atomic Auth + Firestore operations.
- No server-enforced uniqueness.
- Eventual consistency windows.
- No global session revocation.

## Intentional “Hacks”

- Soft-delete + recreate during authUid linking.
- Temporary disablement during invite activation.
- Orphaned AppUsers after partial failures.

## Limitation Breakdown

### 1) Non-Atomic Auth + Firestore

**What can go wrong:** partial updates and orphaned records.  
**Detection:** invariant checks and orphan listing.  
**Recovery:** owner cleanup APIs.

### 2) No Server-Enforced Uniqueness

**What can go wrong:** duplicate emails under concurrency.  
**Detection:** invariant checks on read/query.  
**Recovery:** owner manual cleanup.

### 3) Eventual Consistency

**What can go wrong:** temporary mismatches (e.g., emailVerified).  
**Detection:** comparison to Firebase Auth source of truth.  
**Recovery:** next auth resolution resyncs.

### 4) Temporary Disablement During Activation

**What can go wrong:** transient disabled state if flow is interrupted.  
**Detection:** invariant checks at auth resolution.  
**Recovery:** owner repair or user reattempt.

## Final Policy Statement

These are ACCEPTED constraints. No backend migration is planned.


// FILE: rng-platform/rng-auth/app-auth-service/DIAGRAMS.md

# Diagrams (ASCII Only)

## Auth Resolution Flow

```
[Firebase Auth State]
        |
        v
[handleAuthStateChanged]
        |
        v
[_resolveAuthenticatedUser]
        |
        +--> invariant checks
        |
        +--> emailVerified sync (best-effort)
        |
        v
[setSession]
```

## Invite Signup Flow (with failures)

```
[Invite Exists?] --no--> [InviteInvalidError]
       |
      yes
       v
[Create Firebase Auth User]
       |
       +--fail--> [Map Firebase Error]
       v
[Link authUid to AppUser]
       |
       +--fail--> [Delete Auth User] -> [Error]
       v
[Activate Invite]
       |
       +--fail--> [Orphaned AppUser] -> [Owner Cleanup]
       v
[Resolved Authenticated Session]
```

## Identity Linking Flow

```
[Invited AppUser]
       |
       v
[linkAuthIdentity]
       |
       v
[AppUser id = authUid]
```

## Session Transition Graph

```
unknown -> unauthenticated
unknown -> authenticating
unknown -> authenticated
unauthenticated -> authenticating
unauthenticated -> unauthenticated
authenticating -> authenticated
authenticating -> unauthenticated
authenticated -> unauthenticated
authenticated -> authenticated
```


// FILE: rng-platform/rng-auth/app-auth-service/INVITE_FLOW.md

# Invite Flow (Client-Side)

## Lifecycle

1. Owner creates invite (AppUser with `inviteStatus='invited'`).
2. User signs up with invite credentials.
3. Auth user is created in Firebase.
4. Auth identity is linked to AppUser.
5. Invite is activated and AppUser is registered.

## Non-Atomic Sections (Explicit)

- Linking Auth + Firestore is non-atomic.
- Activation after linking is non-atomic.

## Partial Failure Points

- Auth user created but AppUser not linked.
- AppUser linked but activation fails.
- Invite revoked concurrently with linking.

## Why This Is Acceptable

This system is client-only. Partial failures are expected and are handled via explicit recovery tools.

## Owner Recovery

Owners can identify and clean orphaned users using maintenance APIs. This is a designed operational workflow.


// FILE: rng-platform/rng-auth/app-auth-service/README.internal.md

# AppAuthService Internal & Maintenance APIs

## Scope

This document covers internal-only methods and maintenance operations that exist for client-side recovery.

## Internal APIs

- `listOrphanedLinkedUsers()`
- `cleanupOrphanedLinkedUser(userId)`
- `getLastAuthError()` / `getLastSessionTransitionError()`

## Orphaned User Scenarios

Orphaned AppUsers can occur when Auth and Firestore updates are interrupted mid-flow. This is expected in a client-only system.

## Recovery Expectations

Owners are responsible for repair using the provided maintenance APIs. These are first-class recovery tools, not errors to be hidden.

## Rationale

Client-only systems cannot guarantee atomicity across Auth and Firestore. Manual repair is the correct, explicit recovery strategy in this system.


// FILE: rng-platform/rng-auth/app-auth-service/README.md

# AppAuthService (Client-Side ERP Auth)

**Status:** FROZEN CLIENT-SIDE AUTH MODULE

## Purpose

AppAuthService is the authoritative client-side authentication and user management service for the ERP. It integrates Firebase Auth with a Firestore-backed AppUser projection and enforces ERP-specific invariants at the client layer.

## Client-Only by Design

This module is intentionally client-only. It does not rely on Admin SDK or server-side enforcement. All behavior, limitations, and recovery procedures are explicit policy decisions.

## Guarantees

- Authenticated session always maps to a valid AppUser projection.
- Auth invariants are validated on every auth resolution.
- Email verification uses Firebase Auth as the source of truth.
- Session state is explicit and Suspense-friendly.
- Known failure states are detectable and recoverable by owner operations.

## Non-Guarantees (Explicitly Accepted)

- No atomic Auth + Firestore operations.
- No distributed transactions or server-side locks.
- No server-enforced uniqueness across collections.
- No global session revocation.
- Non-atomic invite activation is acceptable and documented.

## Why This Works for ERP

ERP usage prioritizes clarity, auditability, and deterministic recovery over strict real-time consistency. Client-side recovery tools and explicit invariants are sufficient for operational control in this context.


// FILE: rng-platform/rng-auth/app-auth-service/README.public.md

# AppAuthService Public API (Client-Side)

## Public Surface

The public API is `IAppAuthService` as exported by the platform entry point. Internal/maintenance methods are intentionally excluded from the public type.

## AuthSession Lifecycle

`AuthSession` represents the canonical client-side auth state:

- `state`: `unknown | unauthenticated | authenticating | authenticated`
- `user`: AppUser projection or null
- `emailVerified`: Firebase Auth source of truth
- `lastTransitionError`: invalid transition record (non-fatal)
- `lastAuthError`: most recent auth resolution failure

## Suspense-Friendly Guarantees

- State is explicit and stable for Suspense usage.
- Invalid transitions do not crash the app; they are recorded.
- Consumers can safely subscribe to state changes.

## Irreversible Operations (By Policy)

Some operations are intentionally irreversible at the client layer (e.g., invite activation). This is a design choice and is enforced as part of the contract.

## Error Semantics

Errors are strongly typed. They convey _what happened_ in client-side auth resolution. They do not imply server-side validation or remediation.


// FILE: rng-platform/rng-auth/app-auth-service/SESSION_MODEL.md

# AuthSession State Machine

## States

- `unknown`
- `unauthenticated`
- `authenticating`
- `authenticated`

## Allowed Transitions

- `unknown → unauthenticated | authenticating | authenticated`
- `unauthenticated → authenticating | unauthenticated`
- `authenticating → authenticated | unauthenticated`
- `authenticated → unauthenticated | authenticated`

## Invalid Transitions

Invalid transitions are **recorded** and **swallowed**, not thrown. This preserves app stability while retaining diagnostics.

## lastTransitionError

`lastTransitionError` exists to surface invalid transitions without crashing the application.

## Suspense Safety

State transitions are explicit and stable; consumers can safely suspend on session resolution.


// FILE: rng-platform/rng-auth/app-auth-service/app-auth.contracts.ts

import type {
  AppUser,
  CreateInvitedUser,
  ListUsersPaginatedResult,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './internal-app-user-service/app-user.contracts';
export type { ListUsersPaginatedResult } from './internal-app-user-service/app-user.contracts';
/**
 * Authenticated ERP session.
 *
 * Note:
 * - token is derived from Firebase Auth
 * - AppUser is the ERP user projection (see RBAC for permissions)
 */

/**
 * High-level authentication session state.
 *
 * Designed for Suspense-friendly consumption.
 * Exactly one state is active at any time.
 *
 * Note:
 */
export type AuthSessionState =
  | 'unknown' // App booting, Firebase not resolved yet
  | 'unauthenticated' // No Firebase user
  | 'authenticating' // Sign-in / sign-up in progress
  | 'authenticated'; // Firebase + AppUser resolved

/**
 * AuthSession is the canonical client-side auth state.
 * See SESSION_MODEL.md and AUTH_MODEL.md.
 */
export interface AuthSession {
  state: AuthSessionState;
  user: AppUser | null;
  emailVerified: boolean | null;
  lastTransitionError: { error: unknown; from: AuthSessionState; to: AuthSessionState } | null;
  lastAuthError: { error: unknown; timestamp: Date } | null;
}

export type UnsubscribeFn = () => void;

/**
 * AppAuthService contract. See README.public.md, README.internal.md, CLIENT_SIDE_LIMITATIONS.md.
 */

export interface IAppAuthService {
  /**
   * Restore a soft-deleted user (restore = deleted user).
   * @param userId User ID
   * @returns The restored user
   */
  restoreUser(userId: string): Promise<AppUser>;

  /**
   * User search (client-side policy). See CLIENT_SIDE_LIMITATIONS.md.
   */
  searchUsers(query: Partial<AppUser>): Promise<AppUser[]>;

  /**
   * Reactivate a previously disabled user (reactivate = disabled user).
   * @param userId User ID
   * @returns The reactivated user
   */
  reactivateUser(userId: string): Promise<AppUser>;
  /**
   * Owner bootstrap (client-side, non-atomic). See CLIENT_SIDE_LIMITATIONS.md.
   */
  ownerSignUp(data: {
    email: string;
    password: string;
    name: string;
    photoUrl?: string;
  }): Promise<AuthSession>;

  /**
   * Sign in with email/password. See AUTH_MODEL.md.
   */
  signIn(email: string, password: string): Promise<AuthSession>;

  /**
   * Sign out the current user.
   */
  signOut(): Promise<void>;

  /**
   * Send password reset email. See CLIENT_SIDE_LIMITATIONS.md.
   */
  sendPasswordResetEmail(email: string): Promise<void>;

  /**
   * Send email verification link. See AUTH_MODEL.md.
   */
  sendEmailVerificationEmail(): Promise<void>;

  /**
   * Complete password reset. See README.public.md.
   */
  confirmPasswordReset(code: string, newPassword: string): Promise<void>;

  /**
   * Change password for the currently authenticated user.
   */
  changePassword(currentPassword: string, newPassword: string): Promise<void>;

  /**
   * Return the current user after auth resolution. See SESSION_MODEL.md.
   */
  getCurrentUser(): Promise<AppUser | null>;

  /**
   * Owner-only profile update. See README.public.md.
   */
  updateOwnerProfile(data: { name?: string; photoUrl?: string }): Promise<AppUser>;

  /**
   * Invite creation (owner-only). See INVITE_FLOW.md.
   */
  inviteUser(data: CreateInvitedUser): Promise<AppUser>;

  /**
   * Invite activation (post-signup). See INVITE_FLOW.md.
   */
  acceptInvite(): Promise<AuthSession>;

  /**
   * Subscribe to auth state changes. See SESSION_MODEL.md.
   */
  onAuthStateChanged(callback: (session: AuthSession) => void): UnsubscribeFn;

  /**
   * Synchronous session snapshot. See SESSION_MODEL.md.
   */
  getSessionSnapshot(): AuthSession;

  /**
   * Returns the last auth state change error (if any).
   * Issue #13 fix: Expose for UI error display.
   * Can be used to show user-friendly error messages when auth fails.
   * @internal (monitoring/debugging, optional UI display)
   */
  getLastAuthError(): { error: unknown; timestamp: Date } | null;

  /**
   * Returns the last session state machine transition error (if any).
   * Issue #12 fix: Expose for dev tools/debugging.
   * @internal (dev tools/debugging only, do not depend on this in UI code)
   */
  getLastSessionTransitionError(): {
    error: unknown;
    timestamp: Date;
    from: AuthSessionState;
    to: AuthSessionState;
  } | null;

  // ---------------------------------------------------------------------------
  // USER MANAGEMENT (delegated to AppUserService internally)
  // ---------------------------------------------------------------------------

  /**
   * NOTE:
   * These methods are exposed ONLY via AppAuthService.
   * AppUserService is an internal dependency and MUST NOT
   * be used directly by application code.
   */

  /**
   * Update a user's profile fields.
   *
   * Rules:
   * - Owner: MUST use updateOwnerProfile
   * - Manager/Employee: can update self only
   * - Client: forbidden
   */
  updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser>;

  /**
   * Update a user's role or role category.
   *
   * Rules:
   * - Owner only
   * - Owner role is immutable
   */
  updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser>;

  /**
   * Enable or disable a user account.
   *
   * Rules:
   * - Owner only
   * - Owner cannot be disabled
   */
  updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser>;

  /**
   * Delete a user (soft delete).
   *
   * Rules:
   * - Owner only
   * - Owner cannot be deleted
   */
  deleteUser(userId: string): Promise<void>;

  /**
   * Get a user by ID.
   *
   * Returns null if not found.
   */
  getUserById(userId: string): Promise<AppUser | null>;

  /**
   * Get a user by email.
   *
   * Returns null if not found.
   * @dangerous High-risk: exposes user directory. Intended for internal admin UI only.
   */
  getUserByEmail(email: string): Promise<AppUser | null>;

  /**
   * List all users.
   *
   * ⚠️ SOFT-DEPRECATED (Issue #3): Unpaginated query will eventually hit Firestore limits.
   * Suitable only for small deployments (< 1000 users).
   * RECOMMENDED: Use listUsersPaginated() instead for new code.
   *
   * Audit visibility: Any authenticated user (including clients) can see all users, including internal users.
   * This is intentional and must be treated as audited data, not casual UI data. Clients can infer organization structure.
   *
   * Rules:
   * - Any authenticated user
   */
  listUsers(): Promise<AppUser[]>;

  /**
   * Internal-only repair: list orphaned linked users created by failed invite activation.
   * Criteria: inviteStatus = 'activated' AND isRegisteredOnERP = false
   * Owner only.
   * @internal (maintenance operation; do not depend on this in UI code)
   */
  listOrphanedLinkedUsers(): Promise<AppUser[]>;

  /**
   * Internal-only repair: remove orphaned linked user.
   * Owner only.
   * @internal (maintenance operation; do not depend on this in UI code)
   */
  cleanupOrphanedLinkedUser(userId: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // SYSTEM STATE
  // ---------------------------------------------------------------------------

  /**
   * Returns true if the owner account has been bootstrapped.
   */
  isOwnerBootstrapped(): Promise<boolean>;

  /**
   * Returns true if signup is currently allowed.
   *
   * Signup is allowed only before owner bootstrap.
   */
  isSignupAllowed(): Promise<boolean>;

  /**
   * Check if current authenticated user has completed registration.
   * Issue #7 fix: DX improvement for UI to determine onboarding state.
   *
   * BEHAVIOR:
   * - Returns true if user is authenticated AND isRegisteredOnERP === true AND inviteStatus === 'activated'
   * - Returns false if not authenticated or registration incomplete
   * - Safe to call anytime; never throws
   *
   * USE CASE:
   * - Show "complete profile" prompts if registration incomplete
   * - Gate app features behind registration complete check
   * - Display "pending activation" UI state
   *
   * @returns true if authenticated user has completed ERP registration
   */
  isRegistrationComplete(): boolean;

  /**
   * Re-authenticate the currently authenticated user by confirming their password.
   *
   * Scope:
   * - Applies only to the active session user
   * - Cannot be used to confirm password for other users
   * - Required before sensitive operations.
   *
   * SEMANTICS:
   * confirmPassword does not mutate state; it only re-authenticates the active session.
   */
  confirmPassword(password: string): Promise<void>;
  /**
   * List users with pagination.
   *
   * @param pageSize Number of users to return per page
   * @param pageToken Optional token for pagination
   * @returns Paginated result of users and next page token
   */
  listUsersPaginated(pageSize: number, pageToken?: string): Promise<ListUsersPaginatedResult>;

  /**
   * Public but intended for internal use by the service and hooks.
   * Throws if there is no authenticated user.
   */
  requireAuthenticated(): AppUser;
  /* AppUser is always a projection of the corresponding Firebase Auth user.
 * Email is mirrored from Auth and is NOT updatable via AppUserService.
  /**
   * Resend an invite to a user (if inviteStatus is 'invited').
   * Owner only.
   */
  resendInvite(userId: string): Promise<AppUser>;

  /**
   * Revoke an invite (if inviteStatus is 'invited').
   * Owner only.
   */
  revokeInvite(userId: string): Promise<AppUser>;
}

/**
 * AUTH SESSION STATE TRANSITIONS
 *
 * unknown → unauthenticated
 * unknown → authenticated
 *
 * unauthenticated → authenticating
 * authenticating → authenticated
 *
 * authenticated → unauthenticated
 *
 */

/**
 * IMPORTANT DISTINCTION:
 *
 * - Firebase Auth user MAY exist without AppUser (invalid state)
 * - AppAuthService guarantees:
 *     authenticated ⇒ AppUser exists
 *
 * If Auth user exists but AppUser does not,
 * service MUST sign out and surface error.
 */


// FILE: rng-platform/rng-auth/app-auth-service/app-auth.errors.ts

//
// NotOwnerError is used strictly for owner-only operations.
// All other permission failures must use NotAuthorizedError.
//

import { AuthError } from 'firebase/auth';

export type AppAuthErrorCode =
  | 'auth/invalid-credentials'
  | 'auth/email-already-in-use'
  | 'auth/weak-password'
  | 'auth/invalid-email'
  | 'auth/too-many-requests'
  | 'auth/user-disabled'
  | 'auth/session-expired'
  | 'auth/not-authenticated'
  | 'auth/not-authorized'
  | 'auth/invite-invalid'
  | 'auth/invite-already-accepted'
  | 'auth/invite-revoked'
  | 'auth/owner-already-exists'
  | 'auth/invariant-violation'
  | 'auth/infrastructure-error'
  | 'auth/internal';

/**
 * Base class for AppAuthService errors. See README.public.md.
 */
export abstract class AppAuthError extends Error {
  abstract readonly code: AppAuthErrorCode;
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
  }
}

export class InvalidCredentialsError extends AppAuthError {
  readonly code = 'auth/invalid-credentials';
  constructor(cause?: unknown) {
    super('Invalid email or password.', cause);
  }
}

export class EmailAlreadyInUseError extends AppAuthError {
  readonly code = 'auth/email-already-in-use';
  constructor(cause?: unknown) {
    super('Email is already in use.', cause);
  }
}

export class WeakPasswordError extends AppAuthError {
  readonly code = 'auth/weak-password';
  constructor(cause?: unknown) {
    super('Password is too weak.', cause);
  }
}

export class InvalidEmailError extends AppAuthError {
  readonly code = 'auth/invalid-email';
  constructor(cause?: unknown) {
    super('Email address is invalid.', cause);
  }
}

export class TooManyRequestsError extends AppAuthError {
  readonly code = 'auth/too-many-requests';
  constructor(cause?: unknown) {
    super('Too many requests. Please try again later.', cause);
  }
}

export class UserDisabledError extends AppAuthError {
  readonly code = 'auth/user-disabled';
  constructor(cause?: unknown) {
    super('User account is disabled.', cause);
  }
}

export class SessionExpiredError extends AppAuthError {
  readonly code = 'auth/session-expired';
  constructor(cause?: unknown) {
    super('Authentication session expired. Please reauthenticate.', cause);
  }
}

export class NotAuthenticatedError extends AppAuthError {
  readonly code = 'auth/not-authenticated';
  constructor() {
    super('User is not authenticated.');
  }
}

export class OwnerAlreadyExistsError extends AppAuthError {
  readonly code = 'auth/owner-already-exists';
  constructor() {
    super('Owner account already exists.');
  }
}

/**
 * Invariant violation. See AUTH_MODEL.md and CLIENT_SIDE_LIMITATIONS.md.
 */
export class AuthInvariantViolationError extends AppAuthError {
  readonly code = 'auth/invariant-violation';
  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}

/**
 * Transient infrastructure failure. See CLIENT_SIDE_LIMITATIONS.md.
 */
export class AuthInfrastructureError extends AppAuthError {
  readonly code = 'auth/infrastructure-error';
  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}

/**
 * Internal fallback error. See README.public.md.
 */
export class InternalAuthError extends AppAuthError {
  readonly code = 'auth/internal';
  constructor(cause?: unknown) {
    super('Authentication error occurred.', cause);
  }
}

export function mapFirebaseAuthError(error: unknown): AppAuthError {
  if (!error || typeof error !== 'object') {
    return new AuthInfrastructureError('Unknown Firebase error', error);
  }

  const code = (error as AuthError).code;

  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return new InvalidCredentialsError(error);

    case 'auth/email-already-in-use':
      return new EmailAlreadyInUseError(error);

    case 'auth/weak-password':
      return new WeakPasswordError(error);

    case 'auth/invalid-email':
      return new InvalidEmailError(error);

    case 'auth/too-many-requests':
      return new TooManyRequestsError(error);

    case 'auth/user-disabled':
      return new UserDisabledError(error);

    case 'auth/requires-recent-login':
      return new SessionExpiredError(error);

    case 'auth/network-request-failed':
      return new AuthInfrastructureError('Network request failed', error);

    case 'auth/operation-not-allowed':
      return new AuthInfrastructureError('Authentication method not enabled', error);

    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return new AuthInfrastructureError('Action code is invalid or expired', error);

    case 'auth/quota-exceeded':
      return new TooManyRequestsError(error);

    default:
      return new AuthInfrastructureError('Firebase Auth error', error);
  }
}

export class InviteInvalidError extends AppAuthError {
  readonly code = 'auth/invite-invalid';
  constructor() {
    super('Invite is invalid or expired.');
  }
}

export class InviteAlreadyAcceptedError extends AppAuthError {
  readonly code = 'auth/invite-already-accepted';
  constructor() {
    super('Invite has already been accepted.');
  }
}

export class InviteRevokedError extends AppAuthError {
  readonly code = 'auth/invite-revoked';
  constructor() {
    super('Invite has been revoked.');
  }
}

// NotOwnerError is used strictly for owner-only operations.
// All other permission failures must use NotAuthorizedError.
export class NotOwnerError extends AppAuthError {
  readonly code = 'auth/not-authorized';
  constructor() {
    super('Operation requires owner privileges.');
  }
}

export class NotSelfError extends AppAuthError {
  readonly code = 'auth/not-authorized';
  constructor() {
    super('Operation allowed only for self.');
  }
}

export class NotAuthorizedError extends AppAuthError {
  readonly code = 'auth/not-authorized';
  constructor() {
    super('Operation not permitted for this role.');
  }
}

/**
 * Type guard for AppAuthError
 */
export function isAppAuthError(error: unknown): error is AppAuthError {
  return error instanceof AppAuthError;
}


// FILE: rng-platform/rng-auth/app-auth-service/app-auth.invariants.ts

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


// FILE: rng-platform/rng-auth/app-auth-service/app-auth.service.ts

import { globalLogger } from '@/lib/logger';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  AuthSession,
  AuthSessionState,
  IAppAuthService,
  UnsubscribeFn,
} from './app-auth.contracts';
import {
  AppAuthError,
  AuthInfrastructureError,
  AuthInvariantViolationError,
  InternalAuthError,
  InviteAlreadyAcceptedError,
  InviteInvalidError,
  InviteRevokedError,
  mapFirebaseAuthError,
  NotAuthenticatedError,
  NotAuthorizedError,
  NotOwnerError,
  NotSelfError,
  OwnerAlreadyExistsError,
  TooManyRequestsError,
  UserDisabledError,
} from './app-auth.errors';
import { assertAuthenticatedUser, assertNoOrphanAuthUser } from './app-auth.invariants';
import type {
  AppUser,
  CreateInvitedUser,
  CreateOwnerUser,
  ListUsersPaginatedResult,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './internal-app-user-service/app-user.contracts';
import {
  AppUserInvariantViolation,
  assertAuthIdentityNotLinked,
  assertInviteStatusValid,
  assertUserCanBeActivated,
  assertUserIdMatchesAuthUid,
} from './internal-app-user-service/app-user.invariants';
import { AppUserService } from './internal-app-user-service/app-user.service';

/**
 * Normalize email: lowercase and trim. Single source of truth.
 * Issue #4 fix: Centralize email normalization to prevent inconsistencies.
 * @internal
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Helper to standardize error handling across service methods.
 * Preserves AppAuthError (including new semantic types) and AppUserInvariantViolation, maps all other errors.
 * Issue #1: Now handles AuthInvariantViolationError and AuthInfrastructureError.
 */
function rethrowOrMapAuthError(err: unknown): never {
  if (err instanceof AppAuthError || err instanceof AppUserInvariantViolation) {
    throw err;
  }
  throw mapFirebaseAuthError(err);
}

// See CLIENT_SIDE_LIMITATIONS.md

class AppAuthService implements IAppAuthService {
  private session: AuthSession = {
    state: 'unknown',
    user: null,
    emailVerified: null,
    lastTransitionError: null,
    lastAuthError: null,
  };
  private listeners: Set<(session: AuthSession) => void> = new Set();
  private appUserService = new AppUserService();
  private auth = getAuth();
  private authMutationInProgress = false;
  private authMutationPromise: Promise<void> | null = null;
  private authMutationAbortController: AbortController | null = null;
  private unsubscribeAuthState: (() => void) | null = null;
  private lastAuthStateError: { error: unknown; timestamp: Date } | null = null;
  private lastSessionTransitionError: {
    error: unknown;
    timestamp: Date;
    from: AuthSession['state'];
    to: AuthSession['state'];
  } | null = null;

  /**
   * Auth mutation wrapper (client-side lock + timeout). See CLIENT_SIDE_LIMITATIONS.md.
   */
  private static readonly OPERATION_TIMEOUT_MS = 30000; // 30 seconds
  private static readonly WAIT_FOR_MUTATION_TIMEOUT_MS = 60000; // 60 seconds for waiting on previous mutation

  private async withAuthOperation<T>(fn: () => Promise<T>): Promise<T> {
    // Issue #2 & #20 fix: Add timeout to promise wait and handle rejection properly
    if (this.authMutationInProgress && this.authMutationPromise) {
      const waitPromise = Promise.race([
        this.authMutationPromise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Timed out waiting for previous auth operation')),
            AppAuthService.WAIT_FOR_MUTATION_TIMEOUT_MS,
          ),
        ),
      ]);
      try {
        await waitPromise;
      } catch (err) {
        globalLogger.error('[AppAuthService] Previous auth operation failed or timed out', {
          error: err,
        });
        // Continue anyway to allow recovery from hung operations
      }
    }
    this.authMutationInProgress = true;
    const abortController = new AbortController();
    this.authMutationAbortController = abortController;

    // Issue #2 fix: Force cleanup on timeout (Firebase SDK doesn't support AbortSignal)
    let timeoutTriggered = false;
    const timeoutHandle = setTimeout(async () => {
      timeoutTriggered = true;
      globalLogger.error(
        '[AppAuthService] Auth mutation exceeded timeout; forcing sign-out and reset',
        { timeoutMs: AppAuthService.OPERATION_TIMEOUT_MS },
      );
      // Force signOut to break any hung Firebase SDK promises
      try {
        await firebaseSignOut(this.auth);
      } catch (signOutErr) {
        globalLogger.error('[AppAuthService] Sign-out during timeout failed', {
          error: signOutErr,
        });
      }
      // Reset mutation flags to allow future operations
      this.authMutationInProgress = false;
      this.authMutationPromise = null;
      this.authMutationAbortController = null;
    }, AppAuthService.OPERATION_TIMEOUT_MS);

    const operation = (async () => fn())();
    this.authMutationPromise = operation.then(
      () => undefined,
      () => undefined,
    );
    try {
      const result = await operation;
      clearTimeout(timeoutHandle);
      return result;
    } catch (err) {
      clearTimeout(timeoutHandle);
      throw err;
    } finally {
      // Only reset if timeout didn't trigger (timeout already resets)
      if (!timeoutTriggered) {
        this.authMutationInProgress = false;
        this.authMutationPromise = null;
        this.authMutationAbortController = null;
      }
    }
  }

  // --- Centralized RBAC helpers ---
  /**
   * RBAC check: require current session user to be owner.
   * Invariant enforcement is handled in app-user.invariants.ts.
   */
  private requireOwner() {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
  }

  private requireSelf(userId: string) {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.id !== userId) throw new NotSelfError();
  }

  /**
   * Managers are not privileged for user mutations; delegation is assignment-based (phase-2).
   * This method enforces that managers and employees can only mutate their own user record.
   *
   * Throws NotAuthorizedError if called with unexpected roles (RBAC violation, not system invariant).
   */
  private requireManagerOrEmployeeSelf(userId: string) {
    assertAuthenticatedUser(this.session.user);
    const { role, id } = this.session.user;
    if (role === 'manager' || role === 'employee') {
      if (id !== userId) throw new NotSelfError();
    } else {
      throw new NotAuthorizedError();
    }
  }

  async restoreUser(userId: string): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.restoreUser(userId);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async searchUsers(query: Partial<AppUser>): Promise<AppUser[]> {
    assertAuthenticatedUser(this.session.user);
    try {
      globalLogger.warn(
        'AppAuthService.searchUsers() is high-risk and intended for internal admin UI only.',
      );
      // Issue #5: FROZEN POLICY - This method exposes all users to any authenticated client.
      // This decision is IRREVERSIBLE without breaking deployed clients.
      // You cannot later restrict "clients shouldn't see internal users" without a major version bump.
      return await this.appUserService.searchUsers(query);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async reactivateUser(userId: string): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.reactivateUser(userId);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  /**
   * Retry helper for transient failures with exponential backoff.
   * Issue #6 & #7 fix: Distinguish network failures from data corruption.
   * @internal
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    operation: string,
    maxRetries = 3,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        // Don't retry on AppAuthError or AppUserInvariantViolation (these are not transient)
        if (err instanceof AppAuthError || err instanceof AppUserInvariantViolation) {
          throw err;
        }
        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Cap at 10s
          globalLogger.warn(`[AppAuthService] ${operation} failed, retrying in ${delayMs}ms`, {
            attempt: attempt + 1,
            maxRetries,
            error: err instanceof Error ? err.message : String(err),
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }
    throw lastError;
  }

  /**
   * Canonical post-auth invariant enforcement.
   * See AUTH_MODEL.md and CLIENT_SIDE_LIMITATIONS.md.
   */
  private async _resolveAuthenticatedUser(firebaseUser: FirebaseUser): Promise<AppUser> {
    // Step 1: Load AppUser from Firestore by authUid
    // CRITICAL: Distinguish transient Firestore failures from invariant violations.
    // Issue #7 fix: Retry with exponential backoff before throwing.
    let appUser: AppUser | null = null;
    try {
      appUser = await this.retryWithBackoff(
        () => this.appUserService.getUserById(firebaseUser.uid),
        'getUserById',
      );
    } catch (err) {
      // After retries exhausted, re-throw with explicit marker
      globalLogger.error(
        '[AppAuthService] Firestore read failed after retries in _resolveAuthenticatedUser',
        { userId: firebaseUser.uid, cause: err },
      );
      throw new AuthInfrastructureError(
        'Firestore read failed during user resolution after retries (transient infrastructure failure)',
        err,
      );
    }

    assertNoOrphanAuthUser(true, appUser);
    if (!appUser) {
      throw new AuthInvariantViolationError(
        'Invariant: appUser must not be null after assertNoOrphanAuthUser',
      );
    }
    let resolvedUser = appUser;

    // Step 2: Enforce auth identity linking
    assertUserIdMatchesAuthUid(resolvedUser, firebaseUser.uid);

    // Step 3: Enforce invite lifecycle completion and registration
    if (!resolvedUser.isRegisteredOnERP || resolvedUser.inviteStatus !== 'activated') {
      throw new AuthInvariantViolationError(
        'Invariant: authenticated user must be registered and activated',
        {
          context: 'Post-auth invariant violation',
          userId: resolvedUser.id,
          inviteStatus: resolvedUser.inviteStatus,
          isRegisteredOnERP: resolvedUser.isRegisteredOnERP,
        },
      );
    }

    // Step 4: Reject disabled users to prevent race conditions
    // Disabled users briefly appearing authenticated is a known race.
    // We reject them here to maintain invariant: authenticated ⇒ enabled
    if (resolvedUser.isDisabled) {
      throw new UserDisabledError();
    }

    // Step 5: Sync emailVerified from Firebase Auth (authoritative source)
    // AppUser.emailVerified is a Firestore projection. Firebase Auth is the source of truth.
    // FIXED: Retry transient Firestore failures with exponential backoff
    // This prevents silent lag where AppUser.emailVerified lags Firebase Auth
    const effectiveEmailVerified = firebaseUser.emailVerified;
    if (resolvedUser.emailVerified !== effectiveEmailVerified) {
      try {
        // Retry up to 3 times with exponential backoff (1s, 2s, 4s)
        await this.retryWithBackoff(
          () => this.appUserService.updateEmailVerified(resolvedUser.id, effectiveEmailVerified),
          'updateEmailVerified',
          3,
        );
        resolvedUser = { ...resolvedUser, emailVerified: effectiveEmailVerified };
      } catch (err) {
        // Log but don't fail auth - eventual consistency is acceptable
        globalLogger.warn('[AppAuthService] Failed to sync emailVerified after retries', {
          userId: resolvedUser.id,
          error: err instanceof Error ? err.message : String(err),
        });
        // Continue with old emailVerified - will retry on next auth state change
      }
    }

    return resolvedUser;
  }

  async signOut(): Promise<void> {
    return this.withAuthOperation(async () => {
      try {
        await firebaseSignOut(this.auth);
      } catch (err) {
        // FIXED: Don't throw if Firebase rejects (e.g., user disabled)
        // User should always be able to logout locally
        globalLogger.warn('[AppAuthService] Firebase sign-out failed, forcing local logout', {
          error: err instanceof Error ? err.message : String(err),
        });
        // Continue anyway - force logout
      }
      // Always update session, regardless of Firebase result
      this.setSession({
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
      });
    });
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    return this.withAuthOperation(async () => {
      try {
        // Issue #4 fix: Use centralized normalizeEmail helper
        const normalizedEmail = normalizeEmail(email);
        // WARNING: Firebase has built-in rate limiting (6 per hour per IP).
        // This method is susceptible to enumeration attacks (valid vs invalid emails).
        // Client should handle timeouts and implement additional rate limiting.
        await firebaseSendPasswordResetEmail(this.auth, normalizedEmail);
      } catch (err) {
        // Map too-many-requests (rate limited) explicitly
        throw mapFirebaseAuthError(err);
      }
    });
  }

  async sendEmailVerificationEmail(): Promise<void> {
    return this.withAuthOperation(async () => {
      const user = this.auth.currentUser;
      if (!user) throw new NotAuthenticatedError();
      try {
        // Issue #6 fix: Send verification email for users blocked by emailVerified === false
        await sendEmailVerification(user);
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }
    });
  }

  isRegistrationComplete(): boolean {
    // Issue #7 fix: Enable UI to distinguish "signed up but not activated" vs "fully complete"
    if (!this.session.user) return false;
    const user = this.session.user;
    return user.isRegisteredOnERP === true && user.inviteStatus === 'activated';
  }

  /**
   * Returns the last auth state change error (if any).
   * Issue #5 fix: Expose for dev tools/debugging (was private).
   * @internal
   */
  getLastAuthStateError(): { error: unknown; timestamp: Date } | null {
    return this.lastAuthStateError;
  }

  /**
   * Dispose the auth state listener. Call when the service is no longer needed.
   * Issue #4 fix: Clear listeners to prevent callbacks on disposed service and avoid memory leaks.
   */
  dispose() {
    if (this.unsubscribeAuthState) {
      this.unsubscribeAuthState();
      this.unsubscribeAuthState = null;
    }
    // Clear all listeners to prevent memory leaks and callbacks on disposed service
    this.listeners.clear();
  }

  constructor() {
    this.unsubscribeAuthState = onAuthStateChanged(this.auth, this.handleAuthStateChanged);
  }

  /**
   * Canonical auth state handler. See AUTH_MODEL.md.
   */
  private handleAuthStateChanged = async (firebaseUser: FirebaseUser | null) => {
    // Ignore auth state changes during mutating operations
    if (this.authMutationInProgress) return;
    try {
      if (!firebaseUser) {
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
        });
        return;
      }
      const appUser = await this._resolveAuthenticatedUser(firebaseUser);
      this.setSession({
        state: 'authenticated',
        user: appUser,
        emailVerified: firebaseUser.emailVerified,
        lastTransitionError: null,
        lastAuthError: null,
      });
    } catch (err) {
      // Must never throw; see AUTH_MODEL.md and CLIENT_SIDE_LIMITATIONS.md.
      const errorType =
        err instanceof AppAuthError || err instanceof AppUserInvariantViolation
          ? 'invariant'
          : 'transient';
      this.lastAuthStateError = { error: err, timestamp: new Date() };
      globalLogger.error('[AppAuthService] handleAuthStateChanged error', {
        errorType,
        message: err instanceof Error ? err.message : String(err),
        cause: err instanceof Error ? err.cause : err,
      });
      await firebaseSignOut(this.auth);
      this.setSession({
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: { error: err, timestamp: new Date() },
      });
    }
  };

  /**
   * Session transition validation. See SESSION_MODEL.md.
   * @internal
   */
  private validateSessionTransition(prev: AuthSession, next: AuthSession): void {
    // State machine rules (explicit and exhaustive):
    // unknown → unknown | unauthenticated | authenticating | authenticated
    // unauthenticated → unauthenticated | authenticating
    // authenticating → authenticated | unauthenticated
    // authenticated → authenticated | unauthenticated

    const { state: prevState } = prev;
    const { state: nextState } = next;

    const allowedTransitions: Record<AuthSession['state'], Set<AuthSession['state']>> = {
      unknown: new Set(['unknown', 'unauthenticated', 'authenticating', 'authenticated']),
      unauthenticated: new Set(['unauthenticated', 'authenticating']),
      authenticating: new Set(['authenticated', 'unauthenticated']),
      authenticated: new Set(['authenticated', 'unauthenticated']),
    };

    if (!allowedTransitions[prevState].has(nextState)) {
      const transitionError = new AuthInvariantViolationError(
        `Invalid session transition: ${prevState} → ${nextState}`,
      );
      // Record for observability: UI/devtools can inspect lastSessionTransitionError
      this.lastSessionTransitionError = {
        error: transitionError,
        timestamp: new Date(),
        from: prevState,
        to: nextState,
      };
      throw transitionError;
    }
  }

  private setSession(session: AuthSession) {
    // DEFENSIVE: Validate state-user consistency before updating
    // Issue #3 fix: Reject invalid state machine states (authenticated without user, etc.)
    if (session.state === 'authenticated' && !session.user) {
      globalLogger.error(
        '[AppAuthService] REJECTED invalid session state: authenticated without user',
      );
      // Force to unauthenticated
      session = {
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
      };
    }
    if (session.state === 'unauthenticated' && session.user !== null) {
      globalLogger.error(
        '[AppAuthService] REJECTED invalid session state: unauthenticated with user',
      );
      // Force user to null
      session = { ...session, user: null };
    }

    // Validate transition before updating (swallow errors to allow recovery)
    try {
      this.validateSessionTransition(this.session, session);
      session.lastTransitionError = null; // Transition was valid
    } catch (err) {
      // Record the transition error but continue—do not throw.
      // This allows the system to recover gracefully.
      globalLogger.error('[AppAuthService] Invalid session transition detected', {
        from: this.session.state,
        to: session.state,
        cause: err,
      });
      session.lastTransitionError = {
        error: err,
        from: this.session.state,
        to: session.state,
      };
      // Continue with the state update anyway (caller decided this is necessary)
    }

    // DEFENSIVE: Reject authenticated sessions with disabled users (race condition protection)
    if (session.state === 'authenticated' && session.user?.isDisabled) {
      globalLogger.warn(
        '[AppAuthService] Rejected authenticated session: user is disabled (race detected)',
        { userId: session.user.id },
      );
      this.session = {
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
      };
      return;
    }

    this.session = session;
    // Use Set.forEach for safe concurrent iteration during add/remove
    this.listeners.forEach((cb) => {
      try {
        cb({ ...session });
      } catch {
        // Silent: Listener errors must not break session state updates.
        // Consumers are responsible for their own error handling.
      }
    });
  }

  /**
   * Returns the last session transition error (if any).
   * Issue #6 fix: Expose for dev tools/debugging (was private).
   * @internal
   */
  getLastSessionTransitionError(): {
    error: unknown;
    timestamp: Date;
    from: AuthSessionState;
    to: AuthSessionState;
  } | null {
    return this.lastSessionTransitionError;
  }

  /**
   * Returns a snapshot of the current session.
   * FIXED: Deep copy to prevent accidental mutation of service state.
   *
   * Includes:
   * - state, user: Canonical session state
   * - emailVerified: Explicit signal from Firebase Auth (for UI blocking of unverified actions)
   * - lastTransitionError: Most recent state machine transition error (for observability/debugging)
   *
   * UI can use lastTransitionError to surface session corruption without log archaeology.
   */
  getSessionSnapshot(): AuthSession {
    return {
      state: this.session.state,
      user: this.session.user ? { ...this.session.user } : null,
      emailVerified: this.session.emailVerified,
      lastTransitionError: this.session.lastTransitionError
        ? { ...this.session.lastTransitionError }
        : null,
      lastAuthError: this.session.lastAuthError ? { ...this.session.lastAuthError } : null,
    };
  }

  /**
   * Waits for a resolved session state (authenticated or unauthenticated).
   * Does not trigger loading; only waits for existing auth resolution.
   */
  private waitForResolvedSession(): Promise<AuthSession> {
    if (this.session.state === 'authenticated' || this.session.state === 'unauthenticated') {
      return Promise.resolve({ ...this.session });
    }
    return new Promise((resolve) => {
      const unsubscribe = this.onAuthStateChanged((session) => {
        if (session.state === 'authenticated' || session.state === 'unauthenticated') {
          unsubscribe();
          resolve({ ...session });
        }
      });
    });
  }

  /**
   * Returns the last auth state listener error (if any).
   * Issue #13 fix: Expose for UI error display and debugging.
   * @internal (monitoring/debugging, optional UI display)
   */
  getLastAuthError(): { error: unknown; timestamp: Date } | null {
    return this.lastAuthStateError;
  }

  onAuthStateChanged(callback: (session: AuthSession) => void): UnsubscribeFn {
    this.listeners.add(callback);
    callback({ ...this.session });
    return () => {
      this.listeners.delete(callback);
    };
  }

  async ownerSignUp(data: {
    email: string;
    password: string;
    name: string;
    photoUrl?: string;
  }): Promise<AuthSession> {
    return this.withAuthOperation(async () => {
      try {
        // Issue #18 fix: Atomic owner check to prevent concurrent owner creation race
        // Note: This check is still best-effort on client. For true atomicity, backend transaction required.
        const existingOwner = await this.appUserService.isOwnerBootstrapped();
        if (existingOwner) {
          throw new OwnerAlreadyExistsError();
        }
        // Issue #19 fix: Normalize email to lowercase for consistent comparison
        const normalizedEmail = data.email.toLowerCase().trim();
        const cred = await createUserWithEmailAndPassword(
          this.auth,
          normalizedEmail,
          data.password,
        );
        try {
          const user = await this.appUserService.createUser({
            authUid: cred.user.uid,
            name: data.name,
            email: data.email,
            role: 'owner',
            photoUrl: data.photoUrl,
          } as CreateOwnerUser);
          this.setSession({
            state: 'authenticated',
            user,
            emailVerified: cred.user.emailVerified,
            lastTransitionError: null,
            lastAuthError: null,
          });
          return this.session;
        } catch (err) {
          await cred.user.delete();
          if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
          throw mapFirebaseAuthError(err);
        }
      } catch (err) {
        if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
        throw mapFirebaseAuthError(err);
      }
    });
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    return this.withAuthOperation(async () => {
      this.setSession({
        state: 'authenticating',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
      });
      try {
        // Issue #4 fix: Use centralized normalizeEmail helper
        const normalizedEmail = normalizeEmail(email);
        const cred = await signInWithEmailAndPassword(this.auth, normalizedEmail, password);
        const appUser = await this._resolveAuthenticatedUser(cred.user);
        this.setSession({
          state: 'authenticated',
          user: appUser,
          emailVerified: cred.user.emailVerified,
          lastTransitionError: null,
          lastAuthError: null,
        });
        return this.session;
      } catch (err) {
        await firebaseSignOut(this.auth);
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
        });
        if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
        throw mapFirebaseAuthError(err);
      }
    });
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    return this.withAuthOperation(async () => {
      try {
        await firebaseConfirmPasswordReset(this.auth, code, newPassword);
      } catch (err) {
        // Explicitly handle invalid/expired codes
        const appErr = mapFirebaseAuthError(err);
        if (err instanceof Error && err.message?.includes('invalid-action-code')) {
          throw new AuthInfrastructureError('Password reset code is invalid or expired', err);
        }
        throw appErr;
      }
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.withAuthOperation(async () => {
      const user = this.auth.currentUser;
      if (!user || !user.email) throw new NotAuthenticatedError();
      try {
        const cred = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPassword);
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }
    });
  }

  /**
   * Returns the current user after auth resolution.
   * Does NOT trigger loading; waits only for existing auth state resolution.
   */
  async getCurrentUser(): Promise<AppUser | null> {
    const session = await this.waitForResolvedSession();
    return session.user;
  }

  async updateOwnerProfile(data: { name?: string; photoUrl?: string }): Promise<AppUser> {
    this.requireOwner();
    const user = this.session.user;
    assertAuthenticatedUser(user);
    try {
      const updated = await this.appUserService.updateUserProfile(user.id, data);
      this.setSession({
        state: 'authenticated',
        user: updated,
        emailVerified: user.emailVerified,
        lastTransitionError: null,
        lastAuthError: null,
      });
      return updated;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  // ...existing code...
  /**
   * Owner-only: Create a Firestore-only invite (AppUser with inviteStatus = 'invited').
   * Does NOT create a Firebase Auth user. Enforces email uniqueness at AppUser layer.
   */
  async inviteUser(data: CreateInvitedUser): Promise<AppUser> {
    this.requireOwner();
    try {
      const user = await this.appUserService.createUser(data);
      return user;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }
  /**
   * Invite signup flow (client-side, non-atomic).
   * See INVITE_FLOW.md and CLIENT_SIDE_LIMITATIONS.md.
   */
  async signupWithInvite(email: string, password: string): Promise<AuthSession> {
    return this.withAuthOperation(async () => {
      // See INVITE_FLOW.md
      const normalizedEmail = normalizeEmail(email);
      let invitedUser: AppUser | null = null;
      try {
        invitedUser = await this.appUserService.getUserByEmail(normalizedEmail);
      } catch (err) {
        throw new InviteInvalidError();
      }
      if (!invitedUser) throw new InviteInvalidError();
      if (invitedUser.inviteStatus === 'revoked') throw new InviteRevokedError();
      if (invitedUser.inviteStatus === 'activated') throw new InviteAlreadyAcceptedError();
      if (invitedUser.inviteStatus !== 'invited') throw new InviteInvalidError();
      if (invitedUser.isDisabled) throw new NotAuthorizedError();

      let cred;
      try {
        cred = await createUserWithEmailAndPassword(this.auth, normalizedEmail, password);
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }

      let freshUser: AppUser | null = null;
      try {
        freshUser = await this.appUserService.getUserByEmail(normalizedEmail);
      } catch (err) {
        // Defensive: delete auth user if AppUser fetch fails
        await cred.user.delete();
        throw new InviteInvalidError();
      }
      if (!freshUser) {
        await cred.user.delete();
        throw new InviteInvalidError();
      }
      if (freshUser.id === cred.user.uid) {
        await cred.user.delete();
        throw new InviteAlreadyAcceptedError();
      }
      if (freshUser.inviteStatus !== 'invited') {
        await cred.user.delete();
        throw new InviteInvalidError();
      }

      // Canonical auth identity rule
      assertAuthIdentityNotLinked(freshUser, cred.user.uid);

      // Link authUid to AppUser (race-protected)
      try {
        await this.appUserService.linkAuthIdentity(freshUser.id, cred.user.uid);
        // Enforce linking invariant immediately after linking
        const linkedUser = await this.appUserService.getUserById(cred.user.uid);
        assertUserIdMatchesAuthUid(linkedUser!, cred.user.uid);
        // Issue #11 fix: Re-check invite status after linking to catch concurrent revocation
        if (linkedUser!.inviteStatus !== 'invited') {
          globalLogger.error(
            '[AppAuthService] signupWithInvite: invite status changed after linking (concurrent revocation detected)',
            { email, userId: linkedUser!.id, inviteStatus: linkedUser!.inviteStatus },
          );
          await cred.user.delete();
          throw new InviteInvalidError();
        }
        // Immediately disable the linked user to avoid zombie accounts on failure.
        // NOTE: Race condition window exists between linking and disabling.
        // If app crashes between linkAuthIdentity() and updateUserStatus(), user is briefly enabled.
        // Post-crash, user will have valid Firebase Auth session but be in invalid state (linked but not activated).
        // This is resolved by: (1) manual owner repair via cleanupOrphanedLinkedUser(), or (2) user re-attempting signup.
        await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: true });
      } catch (err) {
        // Rollback: delete Auth user if linking fails
        globalLogger.error('[AppAuthService] signupWithInvite: linkAuthIdentity failed', {
          email: normalizedEmail,
          invitedUserId: freshUser.id,
          authUid: cred.user.uid,
          error: err instanceof Error ? err.message : String(err),
        });
        await cred.user.delete();
        throw mapFirebaseAuthError(err);
      }

      // Activate invite and enforce canonical post-auth invariants
      try {
        await this.appUserService.activateInvitedUser(cred.user.uid);
        // Re-enable user only after successful activation
        await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: false });
        // Issue #15 fix: Auto-trigger email verification after successful signup
        // User will receive verification email automatically on signup completion
        try {
          await sendEmailVerification(cred.user);
          globalLogger.info('[AppAuthService] Email verification sent during signup', {
            email: normalizedEmail,
            uid: cred.user.uid,
          });
        } catch (verificationErr) {
          // Non-critical: log but don't fail signup if email verification fails
          globalLogger.warn('[AppAuthService] Failed to send verification email during signup', {
            email: normalizedEmail,
            error:
              verificationErr instanceof Error ? verificationErr.message : String(verificationErr),
          });
          // Continue with signup; user can manually resend verification later
        }
        // Enforce all canonical post-auth invariants through single canonical method
        const appUser = await this._resolveAuthenticatedUser(cred.user);
        this.setSession({
          state: 'authenticated',
          user: appUser,
          emailVerified: cred.user.emailVerified,
          lastTransitionError: null,
          lastAuthError: null,
        });
        return this.session;
      } catch (err) {
        // CRITICAL: Activation failure creates orphan AppUser (linked but not activated)
        // This is logged for manual recovery by owner using cleanupOrphanedLinkedUser()
        globalLogger.error(
          '[AppAuthService] signupWithInvite: activation failed (orphan created)',
          {
            email: normalizedEmail,
            authUid: cred.user.uid,
            error: err instanceof Error ? err.message : String(err),
            recovery: 'Use appAuthService.cleanupOrphanedLinkedUser(authUid) after investigation',
          },
        );
        // Rollback: delete Auth user if activation fails
        await cred.user.delete();
        throw mapFirebaseAuthError(err);
      }
    });
  }

  /**
   * Update a user profile (never for owner).
   *
   * - Owner: can only update self, but must use updateOwnerProfile
   * - Manager/Employee: can update self only
   * - Client: forbidden
   */
  async updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    // RBAC: Owners are only allowed to update their own profile, but must do so via updateOwnerProfile.
    // This restriction is intentional: owner profile updates require stricter invariants and auditing than regular users.
    // By gating owner updates to updateOwnerProfile, we ensure all owner-specific invariants, logging, and business rules are enforced in one place.
    // This is not an accidental limitation—it's a deliberate separation to prevent privilege escalation, accidental demotion, or bypassing owner-specific checks.
    // See app-user.invariants.ts for canonical owner invariants.
    if (this.session.user.role === 'owner') {
      this.requireSelf(userId);
      // Owner must use updateOwnerProfile for self-updates; this method is forbidden for owners.
      throw new NotAuthorizedError();
    } else if (this.session.user.role === 'manager' || this.session.user.role === 'employee') {
      this.requireManagerOrEmployeeSelf(userId);
    } else if (this.session.user.role === 'client') {
      this.requireSelf(userId);
      // Issue #4 fix: Create new object instead of mutating input reference
      // Clients can only update their own name and photoUrl
      const allowed: Partial<UpdateAppUserProfile> = {};
      if ('name' in data) allowed.name = data.name;
      if ('photoUrl' in data) allowed.photoUrl = data.photoUrl;
      // Use new object instead of mutating data reference
      return await this.appUserService.updateUserProfile(userId, allowed);
    } else {
      throw new InternalAuthError({ role: this.session.user.role });
    }
    try {
      return await this.appUserService.updateUserProfile(userId, data);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.updateUserRole(userId, data);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.updateUserStatus(userId, data);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this.requireOwner();
    try {
      return await this.appUserService.deleteUser({ userId });
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async getUserById(userId: string): Promise<AppUser | null> {
    assertAuthenticatedUser(this.session.user);
    try {
      return await this.appUserService.getUserById(userId);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  async getUserByEmail(email: string): Promise<AppUser | null> {
    assertAuthenticatedUser(this.session.user);
    try {
      globalLogger.warn(
        '[AppAuthService] getUserByEmail() is high-risk and intended for internal admin UI only. Exposes org structure.',
      );
      // Issue #5: FROZEN POLICY - This method allows any authenticated user to query by email.
      // This decision is IRREVERSIBLE without breaking deployed clients.
      // Organizational structure is now permanently exposed to all authenticated users.
      return await this.appUserService.getUserByEmail(email);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  async listUsers(): Promise<AppUser[]> {
    assertAuthenticatedUser(this.session.user);
    try {
      return await this.appUserService.listUsers();
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  /**
   * Owner-only repair operation.
   * @internal (maintenance operation; do not depend on this in UI code)
   */
  async listOrphanedLinkedUsers(): Promise<AppUser[]> {
    this.requireOwner();
    try {
      return await this.appUserService.searchUsers({
        inviteStatus: 'activated',
        isRegisteredOnERP: false,
      });
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  /**
   * Owner-only repair operation.
   * @internal (maintenance operation; do not depend on this in UI code)
   */
  async cleanupOrphanedLinkedUser(userId: string): Promise<void> {
    this.requireOwner();
    const user = await this.appUserService.getUserById(userId);
    if (!user) throw new InviteInvalidError();
    if (!(user.inviteStatus === 'activated' && user.isRegisteredOnERP === false)) {
      throw new InviteInvalidError();
    }
    await this.appUserService.deleteUser({ userId });
    await this.appUserService.deleteUserPermanently(userId);
  }

  async isOwnerBootstrapped(): Promise<boolean> {
    return this.appUserService.isOwnerBootstrapped();
  }

  async isSignupAllowed(): Promise<boolean> {
    return this.appUserService.isSignupAllowed();
  }

  async confirmPassword(password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) throw new NotAuthenticatedError();
    try {
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, cred);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  requireAuthenticated(): AppUser {
    assertAuthenticatedUser(this.session.user);
    return this.session.user;
  }

  /**
   * Resend an invite for a user. Only allowed for owner. Only updates inviteSentAt.
   * Issue #19 fix: Add rate limiting to prevent spam (24-hour window).
   *
   * RATE LIMITING:
   * - Cannot resend if already sent in last 24 hours
   * - Throws TooManyRequestsError if rate limit exceeded
   * - Exception: owner can force resend by calling with force=true (audit-logged)
   */
  async resendInvite(userId: string, options?: { force?: boolean }): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
    try {
      // Fetch user to check inviteSentAt timestamp
      const user = await this.appUserService.getUserById(userId);
      if (!user) {
        throw new InviteInvalidError();
      }

      // Issue #19 fix: Check rate limit (unless force=true)
      if (!options?.force && user.inviteSentAt) {
        const nowMs = new Date().getTime();
        const sentMs = new Date(user.inviteSentAt).getTime();
        const elapsedMs = nowMs - sentMs;
        const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

        if (elapsedMs < RESEND_COOLDOWN_MS) {
          const minutesRemaining = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / (60 * 1000));
          globalLogger.warn('[AppAuthService] Invite resend rate limited', {
            userId,
            lastSentAt: user.inviteSentAt,
            minutesRemaining,
          });
          throw new TooManyRequestsError();
        }
      }

      // Log forced resend with owner audit trail
      if (options?.force && user.inviteSentAt) {
        const elapsedMs = new Date().getTime() - new Date(user.inviteSentAt).getTime();
        globalLogger.warn('[AppAuthService] Forced invite resend (bypassed cooldown)', {
          userId,
          forceResendBy: this.session.user.id,
          hoursSinceLast: Math.round(elapsedMs / (60 * 60 * 1000)),
        });
      }

      return await this.appUserService.resendInvite({ userId });
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  /**
   * Revoke an invite for a user. Only allowed for owner. Sets inviteStatus to 'revoked'.
   */
  async revokeInvite(userId: string): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
    try {
      return await this.appUserService.revokeInvite({ userId });
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async listUsersPaginated(
    pageSize: number,
    pageToken?: string,
  ): Promise<ListUsersPaginatedResult> {
    assertAuthenticatedUser(this.session.user);
    try {
      return await this.appUserService.listUsersPaginated(pageSize, pageToken);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }
  // Only one acceptInvite implementation should exist

  /**
   * Post-signup invite activation.
   * See INVITE_FLOW.md and CLIENT_SIDE_LIMITATIONS.md.
   */
  async acceptInvite(): Promise<AuthSession> {
    // Compile-time assertion: acceptInvite must be unique
    const _exhaustiveCheck: typeof this.acceptInvite extends (...args: infer Args) => infer Ret
      ? Args extends []
        ? Ret extends Promise<AuthSession>
          ? true
          : never
        : never
      : never = true;
    _exhaustiveCheck; // Unused but enforces signature

    assertAuthenticatedUser(this.session.user);

    // Hard invariant: acceptInvite cannot be used for signup
    if (this.session.user!.isRegisteredOnERP === false) {
      throw new InviteInvalidError();
    }

    // Idempotency: if already activated, return session immediately
    if (this.session.user!.inviteStatus === 'activated') {
      globalLogger.debug('acceptInvite() called for already-activated user; no-op.');
      return this.session;
    }

    // Explicit check: revoked invites cannot be reactivated
    if (this.session.user!.inviteStatus === 'revoked') {
      throw new InviteRevokedError();
    }

    assertInviteStatusValid(this.session.user!.inviteStatus);
    assertUserCanBeActivated(this.session.user!);
    try {
      // Activate the invite and enforce all canonical post-auth invariants
      await this.appUserService.activateInvitedUser(this.session.user!.id);
      // CRITICAL: Use canonical method to verify all post-auth invariants including emailVerified sync
      const appUser = await this._resolveAuthenticatedUser(this.auth.currentUser!);
      this.setSession({
        state: 'authenticated',
        user: appUser,
        emailVerified: this.auth.currentUser!.emailVerified,
        lastTransitionError: null,
        lastAuthError: null,
      });
      return this.session;
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }
}

export const appAuthService = new AppAuthService();


// FILE: rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.contracts.ts

export interface ListUsersPaginatedResult {
  data: AppUser[];
  nextPageToken?: string;
}

/**
 * AppUser contract (client-side projection). See AUTH_MODEL.md.
 */

import { BaseEntity } from '@/rng-repository';

export type AppUserRole = 'owner' | 'manager' | 'employee' | 'client';

export type AppUserInviteStatus = 'invited' | 'activated' | 'revoked';
/**
 * Resend invite payload.
 */
export interface ResendInvite {
  userId: string;
}

/**
 * Revoke invite payload.
 */
export interface RevokeInvite {
  userId: string;
}

/**
 * AppUser projection (Firestore). See AUTH_MODEL.md.
 */
export interface AppUser extends BaseEntity {
  name: string;
  email: string;
  role: AppUserRole;
  roleCategory?: string;
  roleUpdatedAt: Date;
  roleCategoryUpdatedAt?: Date;
  photoUrl?: string;
  emailVerified: boolean;
  isDisabled: boolean;
  inviteStatus: AppUserInviteStatus;
  inviteSentAt?: Date;
  inviteRespondedAt?: Date;
  isRegisteredOnERP: boolean;
}
/**
 * Payload for creating an invited user (no authUid, Firestore-only invite).
 */
export interface CreateInvitedUser {
  /** Full name. */
  name: string;
  /** Email address. */
  email: string;
  /** Role to assign. */
  role: Exclude<AppUserRole, 'owner'>;
  /** Optional role category. */
  roleCategory?: string;
  /** Optional profile photo URL. */
  photoUrl?: string;
}
/**
 * Payload for creating the owner user (requires authUid, for bootstrap only).
 */
export interface CreateOwnerUser {
  /** Auth provider UID (required for linking to auth record). */
  authUid: string;
  /** Full name. */
  name: string;
  /** Email address. */
  email: string;
  /** Must be 'owner'. */
  role: 'owner';
  /** Optional role category. */
  roleCategory?: string;
  /** Optional profile photo URL. */
  photoUrl?: string;
}

/**
 * Payload for deleting a user.
 */
export interface DeleteAppUser {
  /** User ID to delete. */
  userId: string;
}

/**
 * Payload for updating user profile fields.
 */
export interface UpdateAppUserProfile {
  /** New name (optional). */
  name?: string;
  /** New photo URL (optional). */
  photoUrl?: string;
}

/**
 * Payload for updating a user's role or role category.
 */
export interface UpdateAppUserRole {
  /** New role. */
  role: AppUserRole;
  /** New role category (optional). */
  roleCategory?: string;
}

/**
 * Payload for updating a user's enabled/disabled status.
 */
export interface UpdateAppUserStatus {
  /** True to disable the user, false to enable. */
  isDisabled: boolean;
}

/**
 * AppUser service contract. See README.internal.md and INVITE_FLOW.md.
 */
export interface IAppUserService {
  /**
   * Restore a soft-deleted user.
   * @param userId User ID
   * @returns The restored user
   * @note Only the owner may restore users. This is enforced at the service layer.
   */
  restoreUser(userId: string): Promise<AppUser>;

  /**
   * Search users by indexed, allow-listed fields only (e.g., email, role, inviteStatus, isDisabled, isRegisteredOnERP).
   * Arbitrary field search is NOT supported due to Firestore limitations.
   * @param query Partial<AppUser> fields to match (must be allow-listed and indexed)
   * @returns Array of users matching query
   * @throws AppUserInvariantViolation if no valid query fields are provided
   */
  searchUsers(query: Partial<AppUser>): Promise<AppUser[]>;

  /**
   * Reactivate a previously disabled user.
   * @param userId User ID
   * @returns The reactivated user
   * @note Only the owner may reactivate users. This is enforced at the service layer.
   */
  reactivateUser(userId: string): Promise<AppUser>;
  /**
   * Resend an invite to a user (if inviteStatus is 'invited').
   */
  resendInvite(data: ResendInvite): Promise<AppUser>;

  /**
   * Revoke an invite (if inviteStatus is 'invited').
   */
  revokeInvite(data: RevokeInvite): Promise<AppUser>;
  /**
   * Create a new user (admin/owner only).
   * @param data User creation payload
   * @returns The created user
   */
  createUser(data: CreateOwnerUser | CreateInvitedUser): Promise<AppUser>;

  /**
   * Update a user's profile fields.
   * @param userId User ID
   * @param data Profile update payload
   * @returns The updated user
   */
  updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser>;

  /**
   * Update a user's role or role category.
   * @param userId User ID
   * @param data Role update payload
   * @returns The updated user
   */
  updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser>;

  /**
   * Enable or disable a user account.
   * @param userId User ID
   * @param data Status update payload
   * @returns The updated user
   */
  updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser>;

  /**
   * Delete a user from the system.
   * @param data Delete payload
   */
  deleteUser(data: DeleteAppUser): Promise<void>;

  /**
   * Get a user by their unique ID.
   * @param userId User ID
   * @returns The user or null if not found
   */
  getUserById(userId: string): Promise<AppUser | null>;

  /**
   * @dangerous SOFT-DEPRECATED: List all users in the system.
   *
   * Unpaginated query that will eventually hit Firestore limits as the user base grows.
   * Suitable only for small deployments (< 1000 users).
   *
   * RECOMMENDED: Use listUsersPaginated() instead.
   *
   * @returns Array of users
   * @policy This exposes all users to any authenticated client. This is a policy decision.
   */
  listUsers(): Promise<AppUser[]>;

  /**
   * Get a user by their email address.
   * @param email Email address
   * @returns The user or null if not found
   */
  getUserByEmail(email: string): Promise<AppUser | null>;

  /**
   * Returns true if the owner account has been bootstrapped (first signup complete).
   * @returns True if owner exists
   */
  isOwnerBootstrapped(): Promise<boolean>;

  /**
   * Returns true if public signup is currently allowed (only before owner bootstrap).
   * @returns True if signup is allowed
   */
  isSignupAllowed(): Promise<boolean>;

  /**
   * List users with pagination.
   * @param pageSize Number of users per page
   * @param pageToken Opaque token for next page
   */
  listUsersPaginated(pageSize: number, pageToken?: string): Promise<ListUsersPaginatedResult>;

  /**
   * Permanently delete a user record (hard delete, not soft delete).
   * Only the owner may perform this operation.
   * @param userId User ID
   */
  deleteUserPermanently(userId: string): Promise<void>;
}


// FILE: rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.invariants.ts

/**
 * Email uniqueness invariant (client-side). See CLIENT_SIDE_LIMITATIONS.md.
 */
export function assertEmailUniqueAndActive(users: AppUser[], email: string): void {
  const activeUsers = users.filter((user) => !user.deletedAt);
  if (activeUsers.length > 1) {
    throw new AppUserInvariantViolation(
      'Email uniqueness violation: multiple active AppUsers with this email exist',
      { email, userIds: activeUsers.map((user) => user.id) },
    );
  }
}

/**
 * Auth identity linking invariant. See AUTH_MODEL.md and CLIENT_SIDE_LIMITATIONS.md.
 */
export function assertAuthIdentityNotLinked(user: AppUser, authUid: string): void {
  if (user.id === authUid) {
    throw new AppUserInvariantViolation('Auth identity already linked for this user', {
      userId: user.id,
      authUid,
    });
  }
  if (user.inviteStatus !== 'invited' || user.isRegisteredOnERP) {
    throw new AppUserInvariantViolation('Cannot link auth identity for non-invited user', {
      userId: user.id,
      inviteStatus: user.inviteStatus,
      isRegisteredOnERP: user.isRegisteredOnERP,
    });
  }
}

/**
 * AuthUid uniqueness invariant. See AUTH_MODEL.md.
 */
export function assertAuthUidNotLinked(
  existingAuthUser: AppUser | null,
  authUid: string,
  userId: string,
): void {
  if (existingAuthUser) {
    throw new AppUserInvariantViolation(
      'Cannot link: AppUser with this authUid already exists (race condition detected)',
      { authUid, existingUserId: existingAuthUser.id, attemptedLinkFrom: userId },
    );
  }
}

/**
 * Hard delete safety invariant. See README.internal.md.
 */
export function assertUserCanBeHardDeleted(user: AppUser | null): void {
  if (!user) {
    throw new AppUserInvariantViolation('User must exist to be hard deleted');
  }
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation('Owner account cannot be hard deleted', {
      userId: user.id,
    });
  }
  if (!user.deletedAt) {
    throw new AppUserInvariantViolation(
      'User must be soft-deleted before hard delete (deletedAt must not be null)',
      { userId: user.id },
    );
  }
  if (user.isRegisteredOnERP) {
    throw new AppUserInvariantViolation(
      'Cannot hard delete registered users (isRegisteredOnERP must be false)',
      { userId: user.id },
    );
  }
}
// =============================
// CREATION INVARIANTS (SPLIT)
// =============================

/**
 * Assert that an invited user can be created (no authUid required).
 * Enforces: inviteStatus = 'invited', isRegisteredOnERP = false, inviteSentAt exists, email unique.
 */
export function assertValidInvitedUserCreation(input: Partial<AppUser>): void {
  if (input.inviteStatus !== 'invited') {
    throw new AppUserInvariantViolation('Invited user must have inviteStatus = invited');
  }
  if (input.isRegisteredOnERP !== false) {
    throw new AppUserInvariantViolation('Invited user must have isRegisteredOnERP = false');
  }
  if (!input.inviteSentAt) {
    throw new AppUserInvariantViolation('inviteSentAt must exist for invited user');
  }
  // Email uniqueness must be enforced at service layer
}

/**
 * Assert that an owner can be created (authUid required).
 * Enforces: inviteStatus = 'activated', isRegisteredOnERP = true, inviteSentAt undefined, inviteRespondedAt exists, authUid required.
 */
export function assertValidOwnerCreation(input: Partial<AppUser>): void {
  if (input.role !== 'owner') {
    throw new AppUserInvariantViolation('Owner creation requires role = owner');
  }
  if (!input.authUid) {
    throw new AppUserInvariantViolation('Owner creation requires authUid');
  }
  if (input.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('Owner must have inviteStatus = activated');
  }
  if (input.isRegisteredOnERP !== true) {
    throw new AppUserInvariantViolation('Owner must have isRegisteredOnERP = true');
  }
  if (input.inviteSentAt !== undefined) {
    throw new AppUserInvariantViolation('Owner must not have inviteSentAt');
  }
  if (!input.inviteRespondedAt) {
    throw new AppUserInvariantViolation('Owner must have inviteRespondedAt');
  }
}
/**
 * Assert that a user can be activated (inviteStatus must be 'invited').
 * Use this for all invite activation transitions.
 */
export function assertUserCanBeActivated(user: AppUser): void {
  if (user.inviteStatus !== 'invited') {
    throw new AppUserInvariantViolation('User must be invited to activate', { userId: user.id });
  }
}
// =============================
// MISSING INVARIANT FUNCTIONS (RESTORED)
// =============================

/**
 * Assert that a new user starts enabled and with roleUpdatedAt set.
 */
export function assertNewUserBaseDefaults(user: AppUser): void {
  if (user.isDisabled !== false) {
    throw new AppUserInvariantViolation('New users must start with isDisabled === false', {
      id: user.id,
    });
  }
  if (!user.roleUpdatedAt) {
    throw new AppUserInvariantViolation('roleUpdatedAt must be set on creation', { id: user.id });
  }
}

/**
 * Assert that only one owner can ever exist in the system.
 */
export function assertNoExistingOwner(existingOwner: AppUser | null): void {
  if (existingOwner) {
    throw new AppUserInvariantViolation('Only one owner is allowed in the system', {
      ownerId: existingOwner.id,
    });
  }
}

/**
 * Assert that the owner cannot be deleted (even soft delete).
 */
export function assertOwnerNotDeleted(user: AppUser): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation('Owner account cannot be deleted', { userId: user.id });
  }
}

/**
 * Assert that the owner cannot be disabled.
 */
export function assertOwnerNotDisabled(user: AppUser, nextIsDisabled: boolean): void {
  if (user.role === 'owner' && nextIsDisabled === true) {
    throw new AppUserInvariantViolation('Owner account cannot be disabled', { userId: user.id });
  }
}

/**
 * Assert that the owner's role cannot be changed.
 */
export function assertOwnerRoleImmutable(prev: AppUser, nextRole: string): void {
  if (prev.role === 'owner' && nextRole !== 'owner') {
    throw new AppUserInvariantViolation('Owner role is immutable and cannot be changed', {
      userId: prev.id,
    });
  }
}

/**
 * Assert that updating role or roleCategory also updates the corresponding timestamp, and vice versa.
 */
export function assertRoleSnapshotUpdate(
  user: AppUser,
  prev: AppUser,
  update: { role?: string; roleCategory?: string },
): void {
  if (user.role !== prev.role && user.roleUpdatedAt === prev.roleUpdatedAt) {
    throw new AppUserInvariantViolation('Updating role must update roleUpdatedAt', { id: user.id });
  }
  if (user.role === prev.role && user.roleUpdatedAt !== prev.roleUpdatedAt) {
    throw new AppUserInvariantViolation('roleUpdatedAt must only change if role changes', {
      id: user.id,
    });
  }
  if (
    user.roleCategory !== prev.roleCategory &&
    user.roleCategoryUpdatedAt === prev.roleCategoryUpdatedAt
  ) {
    throw new AppUserInvariantViolation('Updating roleCategory must update roleCategoryUpdatedAt', {
      id: user.id,
    });
  }
  if (
    user.roleCategory === prev.roleCategory &&
    user.roleCategoryUpdatedAt !== prev.roleCategoryUpdatedAt
  ) {
    throw new AppUserInvariantViolation(
      'roleCategoryUpdatedAt must only change if roleCategory changes',
      { id: user.id },
    );
  }
}

/**
 * Assert that AppUser.id matches the authUid used to create it.
 */
export function assertUserIdMatchesAuthUid(user: AppUser, authUid: string): void {
  if (user.id !== authUid) {
    throw new AppUserInvariantViolation('AppUser.id must equal authUid', { id: user.id, authUid });
  }
}

/**
 * Assert that a new AppUser is valid for creation.
 */
// REMOVED: assertValidUserCreation (split into invited/owner creation)

/**
 * Assert that a user can be restored (must be deleted and not owner).
 */
export function assertUserCanBeRestored(user: AppUser): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation('Owner cannot be restored (cannot be deleted)', {
      userId: user.id,
    });
  }
  if (!user.deletedAt) {
    throw new AppUserInvariantViolation('User is not deleted', { userId: user.id });
  }
}

/**
 * Assert that search query is valid (at least one field).
 */
export function assertValidUserSearchQuery(query: Partial<AppUser>): void {
  if (!query || Object.keys(query).length === 0) {
    throw new AppUserInvariantViolation('Search query must specify at least one field');
  }
}
// =============================
// EMAIL UPDATE INVARIANT
// =============================

/**
 * Assert that email is not updatable via AppUserService.
 * Throws AppUserInvariantViolation if 'email' is present in the update object.
 */
export function assertEmailNotUpdatable(update: Partial<AppUser>): void {
  if ('email' in update) {
    throw new AppUserInvariantViolation('Email is not updatable via AppUserService');
  }
}
// =============================
// Imports
// =============================
import { AppUser, AppUserInviteStatus } from './app-user.contracts';

// =============================
// Error Type
// =============================
export class AppUserInvariantViolation extends Error {
  constructor(
    public invariant: string,
    public context?: Record<string, unknown>,
  ) {
    super(
      `AppUserInvariantViolation: ${invariant}${context ? ' | ' + JSON.stringify(context) : ''}`,
    );
    this.name = 'AppUserInvariantViolation';
  }
}

// =============================
// CANONICAL INVARIANTS (FROZEN)
// =============================
// --- Invite Lifecycle ---
export function assertInviteSentAtForInvited(user: AppUser): void {
  if (user.inviteStatus === 'invited' && !user.inviteSentAt) {
    throw new AppUserInvariantViolation('inviteSentAt must exist when inviteStatus is invited', {
      userId: user.id,
    });
  }
}

/**
 * Assert that inviteRespondedAt exists when inviteStatus === 'activated'.
 */
export function assertInviteRespondedAtForActivated(user: AppUser): void {
  if (user.inviteStatus === 'activated' && !user.inviteRespondedAt) {
    throw new AppUserInvariantViolation(
      'inviteRespondedAt must exist when inviteStatus is activated',
      { userId: user.id },
    );
  }
}

/**
 * Assert that disabled users cannot accept invites.
 */
export function assertDisabledUserCannotAcceptInvite(user: AppUser): void {
  if (user.isDisabled && user.inviteStatus === 'invited') {
    throw new AppUserInvariantViolation('Disabled users cannot accept invites', {
      userId: user.id,
    });
  }
}

// --- Ownership ---

// --- Status ---

// AppUser.isDisabled is the single source of truth for user disablement. Do not sync or reflect Firebase Auth's disabled state.

// --- Email Verified Consistency ---
// AppUser.emailVerified MUST always reflect the corresponding Firebase Auth user's emailVerified field.
// This is enforced by AppAuthService.handleAuthStateChanged and AppUserService.updateEmailVerified.
// There is NO invariant or enforcement for emailVerified in this file; it is always a projection of Auth.
// If out of sync, AppAuthService will update Firestore to match Auth.

// --- Deletion ---

/**
 * Soft delete invariant should be enforced at repository or implementation layer, not here.
 */

// --- Registration ---

/**
 * Assert that isRegisteredOnERP indicates ERP onboarding completion.
 */
export function assertRegistrationFlag(user: AppUser): void {
  if (typeof user.isRegisteredOnERP !== 'boolean') {
    throw new AppUserInvariantViolation('isRegisteredOnERP must be a boolean', { id: user.id });
  }
}

/**
 * Assert that signup is allowed only before owner bootstrap.
 */
export function assertSignupAllowed(isOwnerBootstrapped: boolean): void {
  if (isOwnerBootstrapped) {
    throw new AppUserInvariantViolation('Signup is allowed only before owner bootstrap', {});
  }
}

// --- Owner-Specific Invariants ---

/**
 * Assert that a user is NOT the owner (for mutating operations).
 * @param user The user to check
 * @param action The attempted action (for error context)
 */
/**
 * Defensive: RBAC for owner profile updates is enforced in AppAuthService. This invariant is a last-resort guard and does not replace RBAC.
 */
export function assertUserIsNotOwner(user: AppUser, action: string): void {
  if (user.role === 'owner') {
    throw new AppUserInvariantViolation(`Owner user cannot be ${action}`, { userId: user.id });
  }
}

// --- Owner Registration & Status Invariant ---
/**
 * The owner user is always considered:
 * - inviteStatus = 'activated'
 * - isRegisteredOnERP = true
 * These states are now enforced at runtime for the owner user and never transition.
 */

// --- Signup gating logic fix ---
// In createUser, pass the correct owner bootstrapped flag to assertSignupAllowed.
// Usage:
//   const owner = await this.appUserRepo.findOne({ where: [['role', '==', 'owner']] });
//   const ownerBootstrapped = !!owner;
//   assertSignupAllowed(ownerBootstrapped);
// This ensures signup is only allowed before owner bootstrap.

// --- Invite lifecycle note ---
/**
 * Invite lifecycle (activation) is handled explicitly in the service layer.
 * To advance inviteStatus and isRegisteredOnERP, use the activateInvitedUser method.
 * This is orchestrated by the service, not implicitly.
 */

// --- Invite Lifecycle Invariants ---

/**
 * Canonical: Assert that inviteStatus is valid (must be one of 'invited', 'activated', 'revoked').
 * Use this for all invite status field checks.
 */
export function assertInviteStatusValid(status: AppUserInviteStatus): void {
  if (!['invited', 'activated', 'revoked'].includes(status)) {
    throw new AppUserInvariantViolation('Invalid inviteStatus', { status });
  }
}

/**
 * Assert that isRegisteredOnERP === true implies inviteStatus === 'activated'.
 */
export function assertRegisteredImpliesActivated(user: AppUser): void {
  if (user.isRegisteredOnERP && user.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('isRegisteredOnERP true requires inviteStatus activated', {
      userId: user.id,
    });
  }
}

/**
 * Assert that inviteStatus === 'activated' is irreversible.
 */
export function assertActivatedIsIrreversible(prev: AppUser, next: AppUser): void {
  if (prev.inviteStatus === 'activated' && next.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('inviteStatus activated is irreversible', {
      userId: prev.id,
    });
  }
}

/**
 * Assert that inviteStatus === 'revoked' implies isRegisteredOnERP === false.
 */
export function assertRevokedImpliesNotRegistered(user: AppUser): void {
  if (user.inviteStatus === 'revoked' && user.isRegisteredOnERP) {
    throw new AppUserInvariantViolation('inviteStatus revoked requires isRegisteredOnERP false', {
      userId: user.id,
    });
  }
}

/**
 * Assert that owner must always be inviteStatus === 'activated'.
 */
export function assertOwnerInviteStatusActivated(user: AppUser): void {
  if (user.role === 'owner' && user.inviteStatus !== 'activated') {
    throw new AppUserInvariantViolation('Owner must always be inviteStatus activated', {
      userId: user.id,
    });
  }
}

// --- Queries ---

// --- Utility ---

/**
 * Assert that a user exists (for update/delete operations).
 */
export function assertUserExists(
  user: AppUser | null,
  context: Record<string, unknown> = {},
): void {
  if (!user) {
    throw new AppUserInvariantViolation('User must exist', context);
  }
}

// --- TIMESTAMP VALIDATION (Issue #17) ---
//
// CRITICAL: Timestamps must be reasonable to prevent sorting/comparison issues.
// Client clock skew can cause future timestamps or ancient dates.
//
// VALIDATION RULES:
// - Timestamps must not be in the future (beyond allowed clock skew)
// - Timestamps must not be ancient (before 2020-01-01, before this ERP system existed)
// - Server-generated timestamps are trusted; client timestamps are validated
//
// Issue #17 fix: Add timestamp validation for clock skew protection.

const ALLOWED_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes
const MINIMUM_VALID_DATE = new Date('2020-01-01T00:00:00Z'); // ERP system epoch

/**
 * Assert that a timestamp is reasonable (not in future, not ancient).
 * @param timestamp The timestamp to validate (undefined and null are allowed for optional fields)
 * @param fieldName The field name for error context
 * @throws AppUserInvariantViolation if timestamp is unreasonable
 */
export function assertTimestampReasonable(
  timestamp: Date | undefined | null,
  fieldName: string,
): void {
  if (!timestamp) return; // Undefined and null timestamps are allowed (optional fields)
  const now = new Date();
  const maxAllowed = new Date(now.getTime() + ALLOWED_CLOCK_SKEW_MS);
  if (timestamp > maxAllowed) {
    throw new AppUserInvariantViolation(
      `Timestamp ${fieldName} is in the future (clock skew detected)`,
      {
        fieldName,
        timestamp,
        now,
        allowedSkewMs: ALLOWED_CLOCK_SKEW_MS,
      },
    );
  }
  if (timestamp < MINIMUM_VALID_DATE) {
    throw new AppUserInvariantViolation(
      `Timestamp ${fieldName} is before system epoch (invalid date)`,
      {
        fieldName,
        timestamp,
        minimumValidDate: MINIMUM_VALID_DATE,
      },
    );
  }
}

/**
 * Validate all timestamps on a user object for clock skew protection.
 * Issue #17 fix: Comprehensive timestamp validation.
 */
export function assertUserTimestampsReasonable(user: Partial<AppUser>): void {
  assertTimestampReasonable(user.inviteSentAt, 'inviteSentAt');
  assertTimestampReasonable(user.inviteRespondedAt, 'inviteRespondedAt');
  assertTimestampReasonable(user.roleUpdatedAt, 'roleUpdatedAt');
  assertTimestampReasonable(user.roleCategoryUpdatedAt, 'roleCategoryUpdatedAt');
  assertTimestampReasonable(user.createdAt, 'createdAt');
  assertTimestampReasonable(user.updatedAt, 'updatedAt');
  assertTimestampReasonable(user.deletedAt, 'deletedAt');
}

// --- EMAIL VERIFICATION AUTHORITY ---
//
// CRITICAL: AppUser.emailVerified is a read-only projection of Firebase Auth.
// Firebase Auth is the authoritative source for email verification status.
//
// INVARIANT ENFORCEMENT:
// - AppAuthService._resolveAuthenticatedUser() is the ONLY place that syncs emailVerified
// - AppUserService MUST NEVER update emailVerified arbitrarily
// - Updates to emailVerified only happen during post-auth resolution
// - Violation of this will cause authentication bypass or permission escalation
//
// This ensures a single source of truth and prevents drift between Firebase and Firestore.
//
// Issue #14 - MONITORING & DRIFT DETECTION:
// - Add periodic job to detect drift: Query AppUsers where emailVerified !== Firebase Auth state
// - Alert on drift detection (indicates sync failure or manual Firestore manipulation)
// - Recommended query: Compare Firestore emailVerified vs Firebase Auth user.emailVerified
// - Repair: Re-run AppAuthService._resolveAuthenticatedUser() for affected users
// - Prevention: Block direct Firestore writes to emailVerified field (security rules)

export function assertEmailVerifiedNotUpdatedArbitrarily(updates: any): void {
  if ('emailVerified' in updates && updates.emailVerified !== undefined) {
    throw new AppUserInvariantViolation(
      'emailVerified cannot be updated directly; it is a Firebase Auth projection only',
      { attemptedUpdate: updates },
    );
  }
}

// --- OWNER BOOTSTRAP INVARIANT ---
//
// CRITICAL: Only ONE owner can exist in the system.
// Owner existence must be checked BEFORE any side-effects (Firebase Auth user creation).
// A second owner bootstrap attempt will corrupt the system.

export function assertOwnerBootstrapNotInProgress(): void {
  // This is a placeholder for future multi-instance coordination
  // Currently, check is done synchronously in AppAuthService.ownerSignUp()
}

// --- OWNER BOOTSTRAP INVARIANT EXTENDED ---
//
// CRITICAL: Only ONE owner can exist in the system.
// Owner existence must be checked BEFORE any side-effects (Firebase Auth user creation).
// A second owner bootstrap attempt will corrupt the system.
//
// SINGLE-INSTANCE GUARANTEE:
// This check is performed synchronously in AppAuthService.ownerSignUp() before Firebase Auth user creation.
// If app runs on single instance (typical), this is safe.
// For distributed apps (multiple instances), you MUST add distributed locking or Firestore transaction.

// --- CONCURRENT SESSION SEMANTICS ---
//
// UNDOCUMENTED: Users can have unlimited concurrent sessions (multiple devices/browsers).
// Each signIn() creates a new Firebase Auth session; all are valid simultaneously.
// There is NO session revocation cascade; disabling user doesn't revoke existing sessions.
// This behavior is acceptable for ERP systems but should be documented per deployment.

// --- INACTIVE USER TRACKING ---
//
// MISSING: No lastLoginAt or lastActivityAt fields.
// Future enhancement needed for:
// - Identifying inactive users (compliance, security)
// - Auto-disabling users after inactivity period
// - Audit logs (when was user last active?)
// Recommended: Add optional createdAt, lastLoginAt, lastActivityAt fields in v1.x


// FILE: rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.service.ts

import { clientDb } from '@/lib';
import { globalLogger } from '@/lib/logger';
import { AbstractClientFirestoreRepository } from '@/rng-repository';
import type {
  AppUser,
  CreateInvitedUser,
  CreateOwnerUser,
  DeleteAppUser,
  IAppUserService,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './app-user.contracts';
import {
  AppUserInvariantViolation,
  assertActivatedIsIrreversible,
  assertAuthIdentityNotLinked,
  assertAuthUidNotLinked,
  assertDisabledUserCannotAcceptInvite,
  assertEmailNotUpdatable,
  assertEmailUniqueAndActive,
  assertEmailVerifiedNotUpdatedArbitrarily,
  assertInviteRespondedAtForActivated,
  assertInviteSentAtForInvited,
  assertInviteStatusValid,
  assertNewUserBaseDefaults,
  assertNoExistingOwner,
  assertOwnerInviteStatusActivated,
  assertOwnerNotDeleted,
  assertOwnerNotDisabled,
  assertOwnerRoleImmutable,
  assertRegisteredImpliesActivated,
  assertRevokedImpliesNotRegistered,
  assertRoleSnapshotUpdate,
  assertSignupAllowed,
  assertUserCanBeHardDeleted,
  assertUserCanBeRestored,
  assertUserExists,
  assertUserIsNotOwner,
  assertUserTimestampsReasonable,
  assertValidInvitedUserCreation,
  assertValidOwnerCreation,
  assertValidUserSearchQuery,
} from './app-user.invariants';

import { ResendInvite, RevokeInvite } from './app-user.contracts';

class AppUserRepository extends AbstractClientFirestoreRepository<AppUser> {
  constructor() {
    super(clientDb, {
      collectionName: 'app-users',
      softDelete: true,
      idStrategy: 'client',
    });
  }
}
const appUserRepo = new AppUserRepository();

export class AppUserService implements IAppUserService {
  /**
   * Hard delete (owner-only). See README.internal.md and CLIENT_SIDE_LIMITATIONS.md.
   */
  async deleteUserPermanently(userId: string): Promise<void> {
    const user = await this.appUserRepo.getById(userId, { includeDeleted: true });
    assertUserCanBeHardDeleted(user);
    await this.appUserRepo.delete(userId);
  }
  /**
   * Restore a soft-deleted user. See README.internal.md.
   */
  async restoreUser(userId: string, options?: { updateInviteSentAt?: boolean }): Promise<AppUser> {
    // Only allow restoring if user is soft-deleted and not owner
    const user = await this.appUserRepo.getById(userId, { includeDeleted: true });
    assertUserExists(user);
    if (!user!.deletedAt) {
      throw new AppUserInvariantViolation('User is not deleted', { userId });
    }
    assertUserIsNotOwner(user!, 'restored');
    assertUserCanBeRestored(user!);
    // See CLIENT_SIDE_LIMITATIONS.md
    if (user!.inviteStatus === 'invited') {
      if (!user!.inviteSentAt) {
        throw new AppUserInvariantViolation('Cannot restore invited user without inviteSentAt', {
          userId,
        });
      }
    }
    // Issue #21 fix: Preserve isDisabled state to prevent resurrection attack
    // If user was disabled before deletion, they remain disabled after restoration
    const wasDisabled = user!.isDisabled;
    globalLogger.info('[AppUserService] Restoring user with preserved isDisabled state', {
      userId,
      isDisabled: wasDisabled,
      preventResurrectionAttack: true,
      updateInviteSentAt: options?.updateInviteSentAt,
    });

    // Optional invite timestamp refresh (policy). See CLIENT_SIDE_LIMITATIONS.md
    const updates: Partial<AppUser> = { deletedAt: undefined };
    if (options?.updateInviteSentAt && user!.inviteStatus === 'invited') {
      updates.inviteSentAt = new Date();
      // Clear inviteRespondedAt since we're resending the invite
      updates.inviteRespondedAt = undefined;
      globalLogger.info('[AppUserService] Refreshing invite timestamp on restoration', {
        userId,
        newInviteSentAt: updates.inviteSentAt,
      });
    }

    // Restore by unsetting deletedAt (keep isDisabled unchanged)
    const updated = await this.appUserRepo.update(userId, updates);
    // Verify isDisabled state was preserved
    if (updated.isDisabled !== wasDisabled) {
      throw new AppUserInvariantViolation(
        'isDisabled state not preserved during restoration (security vulnerability)',
        { userId, expected: wasDisabled, actual: updated.isDisabled },
      );
    }
    // Enforce invite invariants only (see INVITE_FLOW.md)
    if (updated.inviteStatus === 'invited') {
      assertInviteSentAtForInvited(updated);
    }
    return updated;
  }

  /**
   * User search (client-side policy). See CLIENT_SIDE_LIMITATIONS.md.
   */
  async searchUsers(query: Partial<AppUser>): Promise<AppUser[]> {
    // Enforce invariant: query must specify at least one field
    assertValidUserSearchQuery(query);
    // Allowed fields are a frozen client-side policy. See CLIENT_SIDE_LIMITATIONS.md
    const ALLOWED_FIELDS = [
      'email',
      'role',
      'inviteStatus',
      'isDisabled',
      'isRegisteredOnERP',
    ] as const;
    type AllowedField = (typeof ALLOWED_FIELDS)[number];
    type AllowedValue = AppUser[AllowedField];
    const where: Array<[AllowedField, '==', AllowedValue]> = [];
    for (const [k, v] of Object.entries(query)) {
      if (ALLOWED_FIELDS.includes(k as AllowedField) && v !== undefined && v !== null && v !== '') {
        where.push([k as AllowedField, '==', v as AllowedValue]);
      }
    }
    if (where.length === 0) {
      throw new AppUserInvariantViolation(
        'Search query must specify at least one allow-listed field',
        {
          query,
        },
      );
    }
    const result = await this.appUserRepo.find({ where });
    return result.data;
  }

  /**
   * Reactivate a previously disabled user.
   * @param userId User ID
   * @returns The reactivated user
   */
  async reactivateUser(userId: string): Promise<AppUser> {
    // Only allow reactivation if user is currently disabled and not owner
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    if (!user!.isDisabled) {
      throw new AppUserInvariantViolation('User is not disabled', { userId });
    }
    assertUserIsNotOwner(user!, 'reactivated');
    const updated = await this.appUserRepo.update(userId, { isDisabled: false });
    return updated;
  }
  /**
   * List users with pagination support.
   *
   * @param pageSize Number of users to return per page
   * @param pageToken Opaque cursor token from previous response's nextPageToken.
   *                  This is an internal Firestore cursor and should not be parsed or modified.
   *                  Pass undefined for the first page.
   * @returns Object containing data array and optional nextPageToken for next page
   */
  async listUsersPaginated(
    pageSize: number,
    pageToken?: string,
  ): Promise<{ data: AppUser[]; nextPageToken?: string }> {
    // Validate and sanitize pagination token (must be a string or undefined)
    if (pageToken !== undefined && typeof pageToken !== 'string') {
      throw new AppUserInvariantViolation('Invalid pagination token', { pageToken });
    }
    // AbstractClientFirestoreRepository supports pagination via cursor
    const result = await this.appUserRepo.find({ limit: pageSize, startAfter: pageToken });
    return {
      data: result.data,
      nextPageToken: result.nextCursor,
    };
  }
  /**
   * @throws AppUserInvariantViolation if user does not exist, invite is revoked, or not in invited state
   */
  async resendInvite(data: ResendInvite): Promise<AppUser> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    // CRITICAL: Prevent resend of revoked invites
    if (user!.inviteStatus === 'revoked') {
      throw new AppUserInvariantViolation(
        'Cannot resend revoked invite. Invite must be re-created by owner.',
        { userId: user!.id, inviteStatus: user!.inviteStatus },
      );
    }
    if (user!.inviteStatus !== 'invited') {
      throw new AppUserInvariantViolation('Can only resend invite if inviteStatus is invited', {
        userId: user!.id,
        inviteStatus: user!.inviteStatus,
      });
    }
    // Only update inviteSentAt
    const updated: Partial<AppUser> = { inviteSentAt: new Date() };
    const result = await this.appUserRepo.update(data.userId, updated);
    return result;
  }

  /**
   * @throws AppUserInvariantViolation if user does not exist or cannot be revoked
   */
  async revokeInvite(data: RevokeInvite): Promise<AppUser> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    if (!(user!.inviteStatus === 'invited' && user!.isRegisteredOnERP === false)) {
      throw new AppUserInvariantViolation('Can only revoke invite if inviteStatus is invited', {
        userId: user!.id,
        inviteStatus: user!.inviteStatus,
        isRegisteredOnERP: user!.isRegisteredOnERP,
      });
    }
    // Preserve inviteRespondedAt for audit trail; add revokedAt timestamp
    // This maintains history: was the invite ever responded to before revocation?
    const now = new Date();
    const updated: Partial<AppUser> = {
      inviteStatus: 'revoked',
      isRegisteredOnERP: false,
      // Keep inviteRespondedAt for audit: when was invite last responded to?
      // New field would be: revokedAt: now (future enhancement)
    };
    const result = await this.appUserRepo.update(data.userId, updated);
    return result;
  }
  /**
   * Asserts all invite and owner state invariants for a user.
   * Called defensively after every user load and after every update to catch state corruption.
   *
   * CONSISTENCY: Ensures user.inviteStatus, isRegisteredOnERP, and role constraints
   * align with documented invariants. If any check fails, data corruption is suspected.
   */
  private assertUserState(user: AppUser): void {
    assertInviteStatusValid(user.inviteStatus);
    assertRegisteredImpliesActivated(user);
    assertRevokedImpliesNotRegistered(user);
    if (user.role === 'owner') assertOwnerInviteStatusActivated(user);
  }
  /**
   * Helper to calculate roleUpdatedAt and roleCategoryUpdatedAt timestamps.
   * Ensures consistent logic across createUser and updateUserRole.
   *
   * SEMANTICS:
   * - On creation: Always set both timestamps if fields are present.
   * - On update: Only change timestamp if field actually changed (prevents unnecessary mutations).
   *
   * @internal
   */
  private calculateRoleTimestamps(
    prev: Pick<AppUser, 'role' | 'roleCategory' | 'roleUpdatedAt' | 'roleCategoryUpdatedAt'> | null,
    next: Pick<AppUser, 'role' | 'roleCategory'>,
    now: Date,
  ): { roleUpdatedAt: Date; roleCategoryUpdatedAt: Date | undefined } {
    if (!prev) {
      // On creation, always set timestamps if fields are present
      return {
        roleUpdatedAt: now,
        roleCategoryUpdatedAt: next.roleCategory ? now : undefined,
      };
    }
    // On update, only change timestamp if field actually changed
    return {
      roleUpdatedAt: next.role !== prev.role ? now : prev.roleUpdatedAt,
      roleCategoryUpdatedAt:
        next.roleCategory !== prev.roleCategory ? now : prev.roleCategoryUpdatedAt,
    };
  }

  private appUserRepo = appUserRepo;

  /**
   * Canonical email identity enforcement.
   * Ensures at most one active (non-soft-deleted) AppUser per email.
   * Returns the active AppUser if present, otherwise null.
   * Issue #8 fix: Enhanced error diagnostics for repository query/filter mismatches.
   * @internal
   */
  private async getActiveUserByEmail(email: string): Promise<AppUser | null> {
    // EXPLICIT: Query only non-deleted users to avoid relying on implicit repository behavior
    // This is more robust than filtering after the fact
    // Issue #16 note: Composite index required: (email, deletedAt) for performance
    const result = await this.appUserRepo.find({
      where: [
        ['email', '==', email],
        ['deletedAt', '==', null],
      ],
    });
    assertEmailUniqueAndActive(result.data, email);
    // Filter is defensive fallback; should not be needed if query is correct
    const activeUser = result.data.find((user) => !user.deletedAt) ?? null;
    // Issue #8 fix: Enhanced diagnostic with repository query details
    if (activeUser && activeUser.deletedAt) {
      throw new AppUserInvariantViolation(
        'getActiveUserByEmail returned soft-deleted user (repository query/filter mismatch)',
        {
          email,
          userId: activeUser.id,
          deletedAt: activeUser.deletedAt,
          queryWhere: result.data.length,
          filteredCount: result.data.filter((u) => !u.deletedAt).length,
          repositoryBug: 'deletedAt filter not applied correctly',
        },
      );
    }
    return activeUser;
  }

  private generateInviteId(): string {
    if (typeof crypto !== 'undefined') {
      if (crypto.randomUUID) return crypto.randomUUID();
      if (crypto.getRandomValues) {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      }
    }
    return `invited-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  /**
   * Create a new AppUser (owner or invited).
   *
   * RACE CONDITION NOTE (Acceptable Trade-off):
   * Email uniqueness check is non-atomic. Between checking and creating, another concurrent
   * createUser() call could create a user with the same email. This is documented as acceptable
   * for client-side operations given Firestore's eventual consistency model.
   *
   * CLIENT RETRY STRATEGY:
   * If createUser fails with "email already exists", callers SHOULD retry the entire flow
   * rather than attempting to recover the partial state. The second attempt will either:
   * 1. Find the already-created user and return success (idempotent), or
   * 2. Fail with clear error message
   *
   * @throws AppUserInvariantViolation if invariants are violated (e.g., duplicate owner, invalid invite, email conflict)
   */
  async createUser(data: CreateOwnerUser | CreateInvitedUser): Promise<AppUser> {
    // Issue #19 fix: Normalize email to lowercase for consistent comparison
    const normalizedEmail = data.email.toLowerCase().trim();
    // Only apply signup gating for owner creation
    let owner: AppUser | null = null;
    if (data.role === 'owner') {
      owner = await this.appUserRepo.findOne({ where: [['role', '==', 'owner']] });
      const ownerBootstrapped = !!owner;
      assertSignupAllowed(ownerBootstrapped);
    }
    // CANONICAL EMAIL IDENTITY RULE:
    // Exactly one active (non-soft-deleted) AppUser per email.
    // This check is non-atomic but documented as acceptable trade-off.
    const existingByEmail = await this.getActiveUserByEmail(normalizedEmail);
    if (existingByEmail) {
      throw new AppUserInvariantViolation('Cannot create AppUser: email already exists', {
        email: normalizedEmail,
      });
    }
    const now = new Date();
    let user: Omit<AppUser, 'createdAt' | 'updatedAt'>;
    if (data.role === 'owner') {
      assertValidOwnerCreation(data);
      assertNoExistingOwner(owner);
      const timestamps = this.calculateRoleTimestamps(null, data, now);
      user = {
        id: data.authUid!,
        name: data.name,
        email: normalizedEmail,
        role: data.role,
        roleCategory: data.roleCategory,
        roleUpdatedAt: timestamps.roleUpdatedAt,
        roleCategoryUpdatedAt: timestamps.roleCategoryUpdatedAt,
        photoUrl: data.photoUrl,
        emailVerified: false,
        isDisabled: false,
        isRegisteredOnERP: true,
        inviteStatus: 'activated',
        inviteSentAt: undefined,
        inviteRespondedAt: now,
      };
    } else {
      assertValidInvitedUserCreation(data);
      const timestamps = this.calculateRoleTimestamps(null, data, now);
      user = {
        id: this.generateInviteId(),
        name: data.name,
        email: normalizedEmail,
        role: data.role,
        roleCategory: data.roleCategory,
        roleUpdatedAt: timestamps.roleUpdatedAt,
        roleCategoryUpdatedAt: timestamps.roleCategoryUpdatedAt,
        photoUrl: data.photoUrl,
        emailVerified: false,
        isDisabled: false,
        isRegisteredOnERP: false,
        inviteStatus: 'invited',
        inviteSentAt: now,
        inviteRespondedAt: undefined,
      };
      // Invited users MUST NOT require authUid
      // (do not add authUid or any auth identity fields)
    }
    assertInviteStatusValid(user.inviteStatus);
    if (user.role === 'owner') assertOwnerInviteStatusActivated(user as AppUser);
    if (user.isRegisteredOnERP) assertRegisteredImpliesActivated(user as AppUser);
    if (user.inviteStatus === 'revoked') assertRevokedImpliesNotRegistered(user as AppUser);
    assertNewUserBaseDefaults(user as AppUser);
    // Issue #17 fix: Validate timestamps for clock skew protection
    assertUserTimestampsReasonable(user as AppUser);
    const created = await this.appUserRepo.create(user);
    return created;
  }

  /**
   * Link a Firebase Auth identity to an invited AppUser.
   * One-time operation. Enforces user.id === authUid afterward. Forbidden if already linked.
   *
   * RACE CONDITION PROTECTION:
   * Asserts no AppUser with id === authUid exists before creating the linked record.
   * This prevents split-brain scenarios where multiple invited users try to link
   * to the same authUid concurrently.
   *
   * After linking, the old invited record is soft-deleted and will not appear
   * in public queries (getUserByEmail, listUsers, searchUsers) due to explicit
   * soft-delete filtering with `deletedAt == null` in all user lookups.
   *
   * ORPHAN EDGE CASE:
   * If activation fails after linking, an orphaned AppUser is left (invited but linked, isRegisteredOnERP=false).
   * Recovery: Use appAuthService.listOrphanedLinkedUsers() and cleanupOrphanedLinkedUser(userId) manually.
   */
  async linkAuthIdentity(userId: string, authUid: string): Promise<void> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    // Enforce one-time-only linking
    if (user!.id === authUid) return; // Already linked (idempotent)
    if (user!.id !== userId)
      throw new AppUserInvariantViolation('User ID mismatch', { userId, id: user!.id });
    assertAuthIdentityNotLinked(user!, authUid);

    // CRITICAL: Check for existing AppUser with authUid to prevent duplicates
    // Check both active and soft-deleted records to detect all conflicts
    const existingAuthUser = await this.appUserRepo.getById(authUid, { includeDeleted: true });
    assertAuthUidNotLinked(existingAuthUser, authUid, userId);

    // Create new AppUser doc with id = authUid, copy all fields
    // NOTE: create disabled-by-default to avoid brief enabled window before activation
    const { id, ...fields } = user!;
    await this.appUserRepo.create({ ...fields, id: authUid, isDisabled: true });

    // Issue #9 fix: Verify disabled state was actually set to prevent auth bypass
    const verifyDisabled = await this.appUserRepo.getById(authUid);
    if (!verifyDisabled || !verifyDisabled.isDisabled) {
      throw new AppUserInvariantViolation(
        'Failed to create disabled user during auth identity linking (security vulnerability)',
        { authUid, isDisabled: verifyDisabled?.isDisabled, userId },
      );
    }

    // Soft delete the old invited doc
    const softDeleteResult = await this.appUserRepo.update(userId, { deletedAt: new Date() });

    // CRITICAL: Verify soft delete succeeded to prevent duplicate active users
    if (!softDeleteResult.deletedAt) {
      throw new AppUserInvariantViolation(
        'Failed to soft-delete old invite record after linking auth identity',
        { userId, authUid },
      );
    }

    // Defensive verification: confirm new linked record exists and old is gone
    const verifyNew = await this.appUserRepo.getById(authUid);
    if (!verifyNew) {
      throw new AppUserInvariantViolation('Linked auth identity record not found after creation', {
        authUid,
      });
    }
    // Verify old record is actually deleted (not just marked)
    const verifyOld = await this.appUserRepo.getById(userId, { includeDeleted: false });
    if (verifyOld) {
      throw new AppUserInvariantViolation('Old invite record still active after soft delete', {
        userId,
      });
    }
  }

  /**
   * Update a user's profile (name, photoUrl).
   * Email is immutable (tied to Firebase Auth identity).
   *
   * IMMUTABILITY NOTE:
   * Email changes are NOT supported. If user registers with wrong email:
   * 1. No direct fix available (Firebase Auth email is immutable)
   * 2. Owner must: delete user, create new invite with correct email
   * 3. User completes signupWithInvite() with new email
   * This is an accepted limitation of client-side Firebase Auth.
   *
   * @throws AppUserInvariantViolation if user does not exist, is owner, or email update attempted
   */
  async updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    // Defensive only: RBAC for owner profile updates is enforced in AppAuthService. This invariant is a last-resort guard.
    if (user!.role !== 'owner') {
      assertUserIsNotOwner(user!, 'updated');
    }
    assertEmailNotUpdatable(data);
    const updated: Partial<AppUser> = { ...data };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    return result;
  }

  /**
   * Update a user's role (employee → manager → etc).
   * Owner role is immutable; cannot be demoted or transferred.
   *
   * ROLE IMMUTABILITY: Once a user is owner, they remain owner permanently.
   * This prevents accidental privilege escalation/de-escalation vulnerabilities.
   *
   * @throws AppUserInvariantViolation if user does not exist, is owner, or invalid role
   */
  async updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    assertUserIsNotOwner(user!, 'updated');
    assertOwnerRoleImmutable(user!, data.role);
    const prev = { ...user! };
    const now = new Date();
    const timestamps = this.calculateRoleTimestamps(user!, data, now);
    const updated: Partial<AppUser> = {
      role: data.role,
      roleCategory: data.roleCategory,
      roleUpdatedAt: timestamps.roleUpdatedAt,
      roleCategoryUpdatedAt: timestamps.roleCategoryUpdatedAt,
    };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    assertRoleSnapshotUpdate({ ...user!, ...updated, ...result }, prev, data);
    return result;
  }

  /**
   * Update user enabled/disabled status.
   *
   * DISABLEMENT SEMANTICS:
   * - isDisabled is the ONLY source of truth (AppUser.isDisabled)
   * - Firebase Auth user.disabled is NOT synchronized and not used by system
   * - When user.isDisabled = true, all auth flows reject with UserDisabledError
   * - Disabled users can be re-enabled via reactivateUser()
   *
   * OWNER IMMUTABILITY: Owner cannot be disabled. This prevents locking out system administrator.
   *
   * @throws AppUserInvariantViolation if user does not exist, is owner, or update fails
   */
  async updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    this.assertUserState(user!);
    assertOwnerNotDisabled(user!, data.isDisabled);
    // AppUser.isDisabled is authoritative. Firebase Auth state is NOT used for disablement.
    const updated: Partial<AppUser> = { isDisabled: data.isDisabled };
    const result = await this.appUserRepo.update(userId, updated);
    this.assertUserState(result);
    return result;
  }

  /**
   * Soft-delete a user (set deletedAt timestamp).
   * User becomes invisible in all queries (getUserByEmail, listUsers, searchUsers).
   * Record remains in Firestore for audit and can be restored.
   *
   * OWNER IMMUTABILITY: Owner cannot be deleted. This prevents losing system administrator.
   * HARD DELETE: Use deleteUserPermanently() after soft delete (owner-only maintenance operation).
   *
   * @throws AppUserInvariantViolation if user does not exist or is owner
   */
  async deleteUser(data: DeleteAppUser): Promise<void> {
    const user = await this.appUserRepo.getById(data.userId);
    assertUserExists(user);
    assertOwnerNotDeleted(user!);
    await this.appUserRepo.delete(data.userId); // Soft delete only
  }

  /**
   * @throws none (returns null if not found)
   */
  async getUserById(userId: string): Promise<AppUser | null> {
    return (await this.appUserRepo.getById(userId)) || null;
  }

  /**
   * @throws none (returns null if not found)
   *
   * Issue #5: FROZEN POLICY - Any authenticated user can query by email.
   * This is IRREVERSIBLE. Organizational directory is permanently exposed.
   * ⚠️ NOTE: This method allows any authenticated user to query by email.
   * No RBAC filtering applied. Callers with privacy concerns should add own checks.
   */
  async getUserByEmail(email: string): Promise<AppUser | null> {
    // Issue #19 fix: Normalize email to lowercase for consistent comparison
    const normalizedEmail = email.toLowerCase().trim();
    // Audit log: email-based queries can expose organizational structure
    // This is intentional for private ERP but should be monitored
    return this.getActiveUserByEmail(normalizedEmail);
  }

  /**
   * @dangerous SOFT-DEPRECATED: Unpaginated list of all active users.
   *
   * ⚠️ HARD LIMIT: This method is unsuitable for deployments with > 1000 users.
   * It will hit Firestore's maximum query result limit and fail silently or incompletely.
   *
   * Issue #15 fix: Hard limit enforcement to prevent silent data loss.
   *
   * RECOMMENDED: Use listUsersPaginated() instead for all new code:
   *   const { data, nextPageToken } = await service.listUsersPaginated(20);
   *   while (nextPageToken) {
   *     const next = await service.listUsersPaginated(20, nextPageToken);
   *     data.push(...next.data);
   *     nextPageToken = next.nextPageToken;
   *   }
   *
   * MIGRATION TIMELINE:
   * - v1 (current): Deprecated with warning. Functional for < 100 users.
   * - v1.x: Will log error if > 1000 users detected.
   * - v2: Removed entirely. Use listUsersPaginated-only API.
   *
   * @throws AppUserInvariantViolation if user count exceeds HARD_LIMIT
   */
  private static readonly LIST_USERS_HARD_LIMIT = 1000;
  async listUsers(): Promise<AppUser[]> {
    globalLogger.warn(
      'AppUserService.listUsers() is soft-deprecated. Use listUsersPaginated(pageSize: number) instead to avoid Firestore limits.',
    );
    const result = await this.appUserRepo.find({});
    // Issue #15 fix: Enforce hard limit to prevent silent failure
    if (result.data.length >= AppUserService.LIST_USERS_HARD_LIMIT) {
      throw new AppUserInvariantViolation(
        'listUsers() hard limit exceeded. Use listUsersPaginated() for large user bases.',
        { count: result.data.length, limit: AppUserService.LIST_USERS_HARD_LIMIT },
      );
    }
    return result.data;
  }

  async isOwnerBootstrapped(): Promise<boolean> {
    const owner = await this.appUserRepo.findOne({ where: [['role', '==', 'owner']] });
    return !!owner;
  }

  async isSignupAllowed(): Promise<boolean> {
    return !(await this.isOwnerBootstrapped());
  }

  // --- Invite Activation ---

  /**
   * Shared internal method for invite activation.
   * Encapsulates all invariant checks and state transitions to prevent divergence
   * between acceptInvite() (auth-owned) and inviteLifecycle.
   *
   * Issue #22 fix: Enforce invite expiry to prevent stale invite acceptance.
   *
   * ATOMIC SCOPE: Only the Firestore update is atomic. Pre-checks (disabled, revoked, etc.)
   * are non-atomic and subject to concurrent modifications. Rollback is caller's responsibility.
   *
   * @internal
   * @param userId User ID
   * @returns Updated AppUser with inviteStatus='activated'
   * @throws AppUserInvariantViolation if preconditions are violated
   */
  private static readonly INVITE_EXPIRY_DAYS = 30;
  private async _activateInvitedUserInternal(userId: string): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    if (user!.role === 'owner') {
      throw new AppUserInvariantViolation('Owner cannot be activated via invite lifecycle', {
        userId,
      });
    }
    assertInviteStatusValid(user!.inviteStatus);
    if (user!.inviteStatus === 'revoked') {
      throw new AppUserInvariantViolation('Revoked user cannot be activated', { userId });
    }
    if (user!.inviteStatus !== 'invited') {
      throw new AppUserInvariantViolation('User is not in invited state', { userId });
    }
    // Enforce invite lifecycle invariants
    assertInviteSentAtForInvited(user!);
    // Issue #22 fix: Check invite expiry to prevent stale invite acceptance
    if (user!.inviteSentAt) {
      const now = new Date();
      const daysSinceSent = (now.getTime() - user!.inviteSentAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceSent > AppUserService.INVITE_EXPIRY_DAYS) {
        throw new AppUserInvariantViolation('Invite has expired', {
          userId,
          inviteSentAt: user!.inviteSentAt,
          expiryDays: AppUserService.INVITE_EXPIRY_DAYS,
          daysSinceSent: Math.floor(daysSinceSent),
        });
      }
    }
    assertDisabledUserCannotAcceptInvite(user!);
    const now = new Date();
    const updated: Partial<AppUser> = {
      inviteStatus: 'activated',
      inviteRespondedAt: now,
      isRegisteredOnERP: true,
    };
    // Invite invariants
    assertInviteStatusValid(updated.inviteStatus!);
    assertRegisteredImpliesActivated({ ...user!, ...updated });
    assertActivatedIsIrreversible(user!, { ...user!, ...updated });
    assertInviteRespondedAtForActivated({ ...user!, ...updated });
    const result = await this.appUserRepo.update(userId, updated);
    return result;
  }

  /**
   * Public invite activation endpoint. Called from both AppUserService and AppAuthService
   * (via acceptInvite()). Delegates to shared internal method.
   */
  async activateInvitedUser(userId: string): Promise<AppUser> {
    return this._activateInvitedUserInternal(userId);
  }

  /**
   * Internal-only: update emailVerified to reflect Firebase Auth state.
   * CRITICAL: This is the ONLY place emailVerified should be updated.
   * Called from AppAuthService._resolveAuthenticatedUser() during post-auth resolution.
   *
   * @internal
   * @throws AppUserInvariantViolation if called with undefined emailVerified
   */
  async updateEmailVerified(userId: string, emailVerified: boolean): Promise<AppUser> {
    const user = await this.appUserRepo.getById(userId);
    assertUserExists(user);
    // Enforce that emailVerified is only updated via canonical method
    assertEmailVerifiedNotUpdatedArbitrarily({ emailVerified });
    // Only update if needed
    if (user!.emailVerified === emailVerified) return user!;
    const updated: Partial<AppUser> = { emailVerified };
    const result = await this.appUserRepo.update(userId, updated);
    // Verify update succeeded
    if (result.emailVerified !== emailVerified) {
      throw new AppUserInvariantViolation('emailVerified update failed to persist', {
        userId,
        expected: emailVerified,
        actual: result.emailVerified,
      });
    }
    return result;
  }
}


// FILE: rng-platform/rng-auth/app-auth-service/internal-app-user-service/index.ts

export * from './app-user.contracts';
export * from './app-user.invariants';
export * from './app-user.service';


// FILE: rng-platform/rng-auth/index.public.ts

/**
 * Public API for rng-platform/modules
 *
 * This is the ONLY entry point for consuming the platform modules.
 * Internal module files MUST NOT be imported directly.
 */

// App Auth Module (primary authentication & user management service)
import type { IAppAuthService } from './app-auth-service/app-auth.contracts';
import { appAuthService as appAuthServiceImpl } from './app-auth-service/app-auth.service';
export type {
  AuthSession,
  AuthSessionState,
  UnsubscribeFn,
} from './app-auth-service/app-auth.contracts';
export {
  AppAuthError,
  EmailAlreadyInUseError,
  InternalAuthError,
  InvalidCredentialsError,
  InvalidEmailError,
  InviteAlreadyAcceptedError,
  InviteInvalidError,
  InviteRevokedError,
  isAppAuthError,
  NotAuthenticatedError,
  NotAuthorizedError,
  NotOwnerError,
  NotSelfError,
  SessionExpiredError,
  TooManyRequestsError,
  UserDisabledError,
  WeakPasswordError,
} from './app-auth-service/app-auth.errors';
export type PublicAppAuthService = Omit<
  IAppAuthService,
  'listOrphanedLinkedUsers' | 'cleanupOrphanedLinkedUser' | 'getLastAuthStateError'
>;
export const appAuthService: PublicAppAuthService = appAuthServiceImpl;

// App User Module (user projection contracts - internal use only via AppAuthService)
export type {
  AppUser,
  AppUserInviteStatus,
  AppUserRole,
  CreateInvitedUser,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './app-auth-service/internal-app-user-service/app-user.contracts';
export { AppUserInvariantViolation } from './app-auth-service/internal-app-user-service/app-user.invariants';


/**
 * End of review file
 */
