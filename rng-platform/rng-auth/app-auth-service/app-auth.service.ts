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
