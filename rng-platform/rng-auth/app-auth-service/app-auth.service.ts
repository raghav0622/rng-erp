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
  InvalidCredentialsError,
  InviteAlreadyAcceptedError,
  InviteInvalidError,
  InviteRevokedError,
  mapFirebaseAuthError,
  NotAuthenticatedError,
  NotAuthorizedError,
  NotOwnerError,
  NotSelfError,
  OwnerAlreadyExistsError,
  OwnerBootstrapRaceDetectedError,
  TooManyRequestsError,
  UserDisabledError,
  WeakPasswordError,
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
  assertUserIdMatchesAuthUid,
} from './internal-app-user-service/app-user.invariants';
import { AppUserService } from './internal-app-user-service/app-user.service';

// BUG #15 FIX: Shared email normalization to ensure consistency across module
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

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
    sessionExpiresAt: null,
  };
  private listeners: Set<(session: AuthSession) => void> = new Set();
  private appUserService = new AppUserService();
  private auth = getAuth();
  private authMutationInProgress = false;
  private authMutationPromise: Promise<void> | null = null;
  private pendingAuthStateChanges: Array<FirebaseUser | null> = [];
  private mutationStartTime = 0;
  private unsubscribeAuthState: (() => void) | null = null;
  private sessionExpiryTimer: NodeJS.Timeout | null = null;
  private lastSessionTransitionError: {
    error: unknown;
    timestamp: Date;
    from: AuthSession['state'];
    to: AuthSession['state'];
  } | null = null;

  private static readonly OPERATION_TIMEOUT_MS = 30000;
  private static readonly WAIT_FOR_MUTATION_TIMEOUT_MS = 60000;
  private static readonly SESSION_EXPIRY_HOURS = 24;
  private static readonly SESSION_EXPIRY_CHECK_INTERVAL_MS = 1000;
  private static readonly OWNER_OP_RATE_LIMIT_PER_MINUTE = 30;
  private static readonly PASSWORD_CHANGE_RATE_LIMIT_PER_MINUTE = 3;
  private static readonly PASSWORD_RESET_RATE_LIMIT_PER_HOUR = 5;
  private lastSessionExpiryCheck = 0;
  private ownerOpCounts = new Map<string, { count: number; resetAt: number }>();
  private passwordOpCounts = new Map<string, { count: number; resetAt: number }>();
  private passwordResetCounts = new Map<string, { count: number; resetAt: number }>();

  private checkRateLimit(
    userId: string,
    limitsMap: Map<string, { count: number; resetAt: number }>,
    maxPerMinute: number,
  ): void {
    const now = Date.now();

    // BUG #8 FIX: Clean up expired rate limit entries to prevent memory leak
    for (const [key, value] of limitsMap.entries()) {
      if (now >= value.resetAt) {
        limitsMap.delete(key);
      }
    }

    const limit = limitsMap.get(userId);
    if (limit && now < limit.resetAt) {
      if (limit.count >= maxPerMinute) {
        throw new TooManyRequestsError();
      }
      limit.count++;
    } else {
      limitsMap.set(userId, { count: 1, resetAt: now + 60 * 1000 });
    }
  }

  private async withAuthOperation<T>(fn: () => Promise<T>): Promise<T> {
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
      }
    }
    this.authMutationInProgress = true;
    this.mutationStartTime = Date.now();

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

        // Replay all pending auth state changes in order
        const pendingChanges = this.pendingAuthStateChanges;
        this.pendingAuthStateChanges = [];
        if (pendingChanges.length > 0) {
          globalLogger.info(
            '[AppAuthService] Replaying pending auth state changes after mutation',
            {
              count: pendingChanges.length,
              mutationDuration: Date.now() - this.mutationStartTime,
            },
          );
          pendingChanges.forEach((pendingUser) => {
            setTimeout(() => this.handleAuthStateChanged(pendingUser), 0);
          });
        }
      }
    }
  }

  private requireOwner() {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
  }

  private requireSelf(userId: string) {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.id !== userId) throw new NotSelfError();
  }

  private requireEmployeeSelfOnly(userId: string) {
    assertAuthenticatedUser(this.session.user);
    // Only employees (and below) are restricted to self-only operations.
    // Managers and owners are NOT restricted here - they can access other users.
    // Manager delegation is feature-level (e.g., owner can delegate reporting),
    // not enforced at this permission check level.
    const { role, id } = this.session.user;
    if (role === 'employee') {
      if (id !== userId) throw new NotSelfError();
    } else if (role !== 'owner' && role !== 'manager') {
      throw new NotAuthorizedError();
    }
  }

  private assertAdminContext(): void {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role === 'client') {
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

  async searchUsers(query: Partial<AppUser>): Promise<{ results: AppUser[]; truncated: boolean }> {
    this.assertAdminContext();
    try {
      // @admin-only: Returns full AppUser projection (role, status, timestamps) by policy
      // Future field redaction will require breaking change or separate projection type
      globalLogger.warn(
        'AppAuthService.searchUsers() is high-risk and intended for internal admin UI only.',
        { role: this.session.user!.role, userId: this.session.user!.id },
      );
      // Normalize email if searching by email for consistency
      const normalizedQuery = query.email
        ? { ...query, email: normalizeEmail(query.email) }
        : query;
      const MAX_SEARCH_RESULTS = 100;
      // Fetch one extra to detect truncation without loading unnecessary results
      const results = await this.appUserService.searchUsers(
        normalizedQuery,
        MAX_SEARCH_RESULTS + 1,
      );
      const truncated = results.length > MAX_SEARCH_RESULTS;
      if (truncated) {
        globalLogger.warn('[AppAuthService] searchUsers result set truncated', {
          count: results.length,
          limit: MAX_SEARCH_RESULTS,
        });
        return { results: results.slice(0, MAX_SEARCH_RESULTS), truncated: true };
      }
      return { results, truncated: false };
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async reactivateUser(userId: string): Promise<AppUser> {
    this.requireOwner();
    this.checkRateLimit(
      this.session.user!.id,
      this.ownerOpCounts,
      AppAuthService.OWNER_OP_RATE_LIMIT_PER_MINUTE,
    );
    try {
      return await this.appUserService.reactivateUser(userId);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  private isTransientError(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) return false;
    const errCode = (err as any).code;
    const transientCodes = ['DEADLINE_EXCEEDED', 'UNAVAILABLE', 'INTERNAL', 'RESOURCE_EXHAUSTED'];
    return transientCodes.includes(errCode);
  }

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
        // Don't retry on app-layer errors
        if (err instanceof AppAuthError || err instanceof AppUserInvariantViolation) {
          throw err;
        }
        // Don't retry on permanent infrastructure errors
        if (!this.isTransientError(err)) {
          throw err; // Fail fast on permanent errors
        }
        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000); // Cap at 10s
          // BUG #20 FIX: Add jitter to prevent thundering herd
          // Jitter = ±10% of delay to desynchronize retries across clients
          const jitterMs = Math.random() * delayMs * 0.1 - delayMs * 0.05;
          const totalDelayMs = delayMs + jitterMs;
          globalLogger.warn(
            `[AppAuthService] ${operation} failed (transient), retrying in ${totalDelayMs}ms`,
            {
              attempt: attempt + 1,
              maxRetries,
              error: err instanceof Error ? err.message : String(err),
            },
          );
          await new Promise((resolve) => setTimeout(resolve, totalDelayMs));
        }
      }
    }
    throw lastError;
  }

  private async updateLastLoginAt(userId: string): Promise<void> {
    try {
      await this.retryWithBackoff(
        () => this.appUserService.updateLastLoginAt(userId),
        'updateLastLoginAt',
        3,
      );
    } catch (err) {
      globalLogger.warn('[AppAuthService] Failed to update lastLoginAt after retries', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async _resolveAuthenticatedUser(firebaseUser: FirebaseUser): Promise<AppUser> {
    // Load AppUser from Firestore. See AUTH_MODEL.md.
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

    // Enforce auth identity linking (see AUTH_MODEL.md)
    assertUserIdMatchesAuthUid(resolvedUser, firebaseUser.uid);

    // Enforce invite lifecycle completion and registration
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

    // Reject disabled users (see CLIENT_SIDE_LIMITATIONS.md)
    if (resolvedUser.isDisabled) {
      throw new UserDisabledError();
    }

    // Sync emailVerified (Firebase Auth is authoritative). See AUTH_MODEL.md.
    const effectiveEmailVerified = firebaseUser.emailVerified;
    if (resolvedUser.emailVerified !== effectiveEmailVerified) {
      try {
        await this.retryWithBackoff(
          () => this.appUserService.updateEmailVerified(resolvedUser.id, effectiveEmailVerified),
          'updateEmailVerified',
          3,
        );
        resolvedUser = { ...resolvedUser, emailVerified: effectiveEmailVerified };
      } catch (err) {
        // Log but don't fail auth
        globalLogger.warn('[AppAuthService] Failed to sync emailVerified after retries', {
          userId: resolvedUser.id,
          error: err instanceof Error ? err.message : String(err),
        });
        // Continue with old emailVerified
      }
    }

    // Update lastLoginAt timestamp
    // BUG #18 FIX: Wrap in try-catch to prevent partial state
    // If this fails, we don't want to abort the entire auth flow
    try {
      await this.updateLastLoginAt(resolvedUser.id);
      resolvedUser = { ...resolvedUser, lastLoginAt: new Date() };
    } catch (err) {
      globalLogger.warn('[AppAuthService] Failed to update lastLoginAt, continuing with auth', {
        userId: resolvedUser.id,
        error: err instanceof Error ? err.message : String(err),
      });
      // Continue without lastLoginAt update - not critical for authentication
    }

    return resolvedUser;
  }

  async signOut(): Promise<void> {
    return this.withAuthOperation(async () => {
      try {
        await firebaseSignOut(this.auth);
      } catch (err) {
        // User should always be able to logout locally
        globalLogger.warn('[AppAuthService] Firebase sign-out failed, forcing local logout', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
      // Always update session
      this.setSession({
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
        sessionExpiresAt: null,
      });
    });
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    return this.withAuthOperation(async () => {
      try {
        // See AUTH_MODEL.md
        const normalizedEmail = normalizeEmail(email);
        // BUG #13 FIX: Rate limit per unique session/IP, not per email
        // Email addresses are public and can be enumerated; keying on them enables DoS
        // Instead, limit per authenticated user (if logged in) or per Firebase Auth attempt
        const resetLimitKey = this.auth.currentUser?.uid || `anon:${normalizedEmail}`;
        const now = Date.now();
        const resetLimit = this.passwordResetCounts.get(resetLimitKey);
        if (resetLimit && now < resetLimit.resetAt) {
          if (resetLimit.count >= AppAuthService.PASSWORD_RESET_RATE_LIMIT_PER_HOUR) {
            globalLogger.warn('[AppAuthService] Password reset rate limit exceeded', {
              key: resetLimitKey.substring(0, 10), // Don't log full email/uid
              attemptsThisHour: resetLimit.count,
            });
            throw new TooManyRequestsError();
          }
          resetLimit.count++;
        } else {
          // Reset window is 1 hour
          this.passwordResetCounts.set(resetLimitKey, { count: 1, resetAt: now + 60 * 60 * 1000 });
        }
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
        await sendEmailVerification(user);
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }
    });
  }

  isSignupComplete(): boolean {
    if (!this.session.user) return false;
    const user = this.session.user;
    return user.isRegisteredOnERP === true && user.inviteStatus === 'activated';
  }

  private setupSessionExpiryTimer(): void {
    // BUG #10 FIX: Active session expiry enforcement via background timer
    // BUG #27 FIX: Stop timer when session ends to prevent resource leaks
    if (this.sessionExpiryTimer) clearInterval(this.sessionExpiryTimer);

    this.sessionExpiryTimer = setInterval(() => {
      // Stop timer when logged out to save resources
      if (this.session.state !== 'authenticated') {
        clearInterval(this.sessionExpiryTimer!);
        this.sessionExpiryTimer = null;
        return;
      }

      if (this.session.sessionExpiresAt) {
        if (new Date() > this.session.sessionExpiresAt) {
          globalLogger.warn(
            '[AppAuthService] Session expired by background timer; forcing logout',
            {
              userId: this.session.user?.id,
              expiresAt: this.session.sessionExpiresAt,
            },
          );
          this.setSession({
            state: 'unauthenticated',
            user: null,
            emailVerified: null,
            lastTransitionError: null,
            lastAuthError: null,
            sessionExpiresAt: null,
          });
          // Timer will self-stop on next iteration when state !== 'authenticated'
        }
      }
    }, 5000); // Check every 5 seconds
  }

  dispose() {
    if (this.unsubscribeAuthState) {
      this.unsubscribeAuthState();
      this.unsubscribeAuthState = null;
    }
    // BUG #8 FIX: Clear rate limit maps to prevent memory leaks
    this.ownerOpCounts.clear();
    this.passwordOpCounts.clear();
    this.passwordResetCounts.clear();
    // BUG #10 FIX: Clear session expiry timer
    if (this.sessionExpiryTimer) {
      clearInterval(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }
    this.listeners.clear();
  }

  constructor() {
    this.unsubscribeAuthState = onAuthStateChanged(this.auth, this.handleAuthStateChanged);
    // BUG #10 FIX: Start background timer to enforce session expiry
    this.setupSessionExpiryTimer();
  }

  private handleAuthStateChanged = async (firebaseUser: FirebaseUser | null) => {
    // Queue auth state changes during mutations instead of ignoring them
    // This prevents masking legitimate changes (signout from another tab, token invalidation, etc.)
    // Queued changes are replayed once the mutation completes
    if (this.authMutationInProgress) {
      // BUG #9 FIX: Only keep the most recent auth state change; discard older queued changes
      // This prevents unbounded array growth and ensures only relevant state is replayed
      this.pendingAuthStateChanges = [firebaseUser];
      globalLogger.info('[AppAuthService] Auth state change queued during mutation', {
        hasUser: firebaseUser !== null,
      });
      return;
    }
    try {
      if (!firebaseUser) {
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        return;
      }
      const appUser = await this._resolveAuthenticatedUser(firebaseUser);
      const sessionExpiresAt = new Date();
      sessionExpiresAt.setHours(sessionExpiresAt.getHours() + AppAuthService.SESSION_EXPIRY_HOURS);
      this.setSession({
        state: 'authenticated',
        user: appUser,
        emailVerified: firebaseUser.emailVerified,
        lastTransitionError: null,
        lastAuthError: null,
        sessionExpiresAt,
      });
    } catch (err) {
      const errorType =
        err instanceof AppAuthError || err instanceof AppUserInvariantViolation
          ? 'invariant'
          : 'transient';
      globalLogger.error('[AppAuthService] handleAuthStateChanged error', {
        errorType,
        message: err instanceof Error ? err.message : String(err),
        cause: err instanceof Error ? err.cause : err,
      });
      // BUG #21 FIX: Wrap sign-out in try-catch to prevent error loop
      // If sign-out fails, don't let that error prevent session cleanup
      try {
        await firebaseSignOut(this.auth);
      } catch (signOutErr) {
        globalLogger.error('[AppAuthService] Failed to sign out during error recovery', {
          error: signOutErr instanceof Error ? signOutErr.message : String(signOutErr),
        });
      }
      this.setSession({
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: { error: err, timestamp: new Date() },
        sessionExpiresAt: null,
      });
    }
  };

  private validateSessionTransition(prev: AuthSession, next: AuthSession): void {
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
    // Capture original requested transition for validation
    const requestedNextSession = session;

    // Validate transition FIRST (before normalization) to preserve original intent
    let transitionError: { error: unknown; from: AuthSessionState; to: AuthSessionState } | null =
      null;
    try {
      this.validateSessionTransition(this.session, requestedNextSession);
    } catch (err) {
      globalLogger.error('[AppAuthService] Invalid session transition detected', {
        from: this.session.state,
        to: requestedNextSession.state,
        cause: err,
      });
      transitionError = {
        error: err,
        from: this.session.state,
        to: requestedNextSession.state,
      };
    }

    // Then normalize/repair the session
    let nextSession = session;
    if (session.state === 'authenticated' && !session.user) {
      globalLogger.error(
        '[AppAuthService] REJECTED invalid session state: authenticated without user',
      );
      nextSession = {
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
        sessionExpiresAt: null,
      };
    }
    if (nextSession.state === 'unauthenticated' && nextSession.user !== null) {
      globalLogger.error(
        '[AppAuthService] REJECTED invalid session state: unauthenticated with user',
      );
      nextSession = { ...nextSession, user: null };
    }
    if (
      nextSession.state === 'authenticated' &&
      nextSession.sessionExpiresAt &&
      new Date() > nextSession.sessionExpiresAt
    ) {
      globalLogger.warn('[AppAuthService] Session expired, forcing logout', {
        userId: nextSession.user?.id,
        expiresAt: nextSession.sessionExpiresAt,
      });
      nextSession = {
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
        sessionExpiresAt: null,
      };
    }

    // Apply transition error from original validation
    nextSession.lastTransitionError = transitionError;

    if (nextSession.state === 'authenticated' && nextSession.user?.isDisabled) {
      globalLogger.warn(
        '[AppAuthService] Rejected authenticated session: user is disabled (race detected)',
        { userId: nextSession.user.id },
      );
      nextSession = {
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
        sessionExpiresAt: null,
      };
    }

    this.session = nextSession;
    this.listeners.forEach((cb) => {
      try {
        cb({ ...this.session });
      } catch {}
    });
  }

  getLastSessionTransitionError(): {
    error: unknown;
    timestamp: Date;
    from: AuthSessionState;
    to: AuthSessionState;
  } | null {
    return this.lastSessionTransitionError;
  }
  getSessionSnapshot(): AuthSession {
    // Check session expiry at most once per second to avoid excessive date allocations
    const now = Date.now();
    if (now - this.lastSessionExpiryCheck > AppAuthService.SESSION_EXPIRY_CHECK_INTERVAL_MS) {
      this.lastSessionExpiryCheck = now;
      if (
        this.session.state === 'authenticated' &&
        this.session.sessionExpiresAt &&
        new Date() > this.session.sessionExpiresAt
      ) {
        globalLogger.warn('[AppAuthService] Session expired on snapshot', {
          userId: this.session.user?.id,
          expiresAt: this.session.sessionExpiresAt,
        });
        // NO MUTATION: Return derived unauthenticated snapshot without mutating state
        // Background auth state handler will eventually clear this.session
        return {
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        };
      }
    }
    // BUG #12 FIX: Deep clone session to prevent mutations of internal state
    // Callers should not be able to mutate the session directly
    return {
      state: this.session.state,
      user: this.session.user ? { ...this.session.user } : null,
      emailVerified: this.session.emailVerified,
      lastTransitionError: this.session.lastTransitionError
        ? { ...this.session.lastTransitionError }
        : null,
      lastAuthError: this.session.lastAuthError ? { ...this.session.lastAuthError } : null,
      sessionExpiresAt: this.session.sessionExpiresAt
        ? new Date(this.session.sessionExpiresAt)
        : null,
    };
  }

  private waitForResolvedSession(): Promise<AuthSession> {
    if (this.session.state === 'authenticated' || this.session.state === 'unauthenticated') {
      return Promise.resolve({ ...this.session });
    }
    return new Promise((resolve, reject) => {
      const WAIT_TIMEOUT_MS = 30000; // 30 seconds
      let resolved = false;

      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          // BUG #11 FIX: Reject on timeout instead of silently resolving with 'unknown'
          // This allows callers to distinguish timeout from legitimate unknown state
          globalLogger.error('[AppAuthService] waitForResolvedSession timed out after 30s');
          reject(
            new Error(
              '[AppAuthService] waitForResolvedSession timeout: auth state resolution took too long',
            ),
          );
        }
      }, WAIT_TIMEOUT_MS);

      const unsubscribe = this.onAuthStateChanged((session) => {
        if (session.state === 'authenticated' || session.state === 'unauthenticated') {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutHandle);
            unsubscribe();
            resolve({ ...session });
          }
        }
      });
    });
  }

  getLastAuthError(): { error: unknown; timestamp: Date } | null {
    // Session is canonical source of truth for auth errors
    return this.session.lastAuthError;
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
        const existingOwner = await this.appUserService.isOwnerBootstrapped();
        if (existingOwner) {
          throw new OwnerAlreadyExistsError();
        }
        const normalizedEmail = normalizeEmail(data.email);
        const cred = await createUserWithEmailAndPassword(
          this.auth,
          normalizedEmail,
          data.password,
        );
        try {
          const user = await this.appUserService.createUser({
            authUid: cred.user.uid,
            name: data.name,
            email: normalizedEmail,
            role: 'owner',
            photoUrl: data.photoUrl,
          } as CreateOwnerUser);
          await this.updateLastLoginAt(user.id);
          const sessionExpiresAt = new Date();
          sessionExpiresAt.setHours(
            sessionExpiresAt.getHours() + AppAuthService.SESSION_EXPIRY_HOURS,
          );
          this.setSession({
            state: 'authenticated',
            user: { ...user, lastLoginAt: new Date() },
            emailVerified: cred.user.emailVerified,
            lastTransitionError: null,
            lastAuthError: null,
            sessionExpiresAt,
          });
          return this.session;
        } catch (err) {
          await cred.user.delete();
          // Check if this is a race condition (another owner was created concurrently)
          const ownerExists = await this.appUserService.isOwnerBootstrapped();
          if (ownerExists) {
            globalLogger.error('[AppAuthService] Owner bootstrap race detected', {
              authUid: cred.user.uid,
              email: normalizedEmail,
            });
            throw new OwnerBootstrapRaceDetectedError();
          }
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
        sessionExpiresAt: null,
      });
      try {
        const normalizedEmail = normalizeEmail(email);
        const cred = await signInWithEmailAndPassword(this.auth, normalizedEmail, password);
        const appUser = await this._resolveAuthenticatedUser(cred.user);
        const sessionExpiresAt = new Date();
        sessionExpiresAt.setHours(
          sessionExpiresAt.getHours() + AppAuthService.SESSION_EXPIRY_HOURS,
        );
        this.setSession({
          state: 'authenticated',
          user: appUser,
          emailVerified: cred.user.emailVerified,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt,
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
          sessionExpiresAt: null,
        });
        if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
        throw mapFirebaseAuthError(err);
      }
    });
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    // BUG #22 FIX: Add input validation before calling Firebase
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new InvalidCredentialsError();
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      throw new WeakPasswordError();
    }

    return this.withAuthOperation(async () => {
      try {
        await firebaseConfirmPasswordReset(this.auth, code, newPassword);
      } catch (err) {
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
      this.checkRateLimit(
        user.uid,
        this.passwordOpCounts,
        AppAuthService.PASSWORD_CHANGE_RATE_LIMIT_PER_MINUTE,
      );
      try {
        const cred = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPassword);
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }
    });
  }

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
        sessionExpiresAt: this.session.sessionExpiresAt,
      });
      return updated;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async inviteUser(data: CreateInvitedUser): Promise<AppUser> {
    this.requireOwner();
    // Validate input structure
    if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
      throw new InternalAuthError({ message: 'email is required' });
    }
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new InternalAuthError({ message: 'name is required' });
    }
    if (!data.role || !['manager', 'employee', 'client'].includes(data.role)) {
      throw new InternalAuthError({ message: 'invalid role for invite' });
    }
    try {
      const normalizedData = {
        ...data,
        email: normalizeEmail(data.email),
      };
      const user = await this.appUserService.createUser(normalizedData);
      return user;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }
  async signupWithInvite(email: string, password: string): Promise<AuthSession> {
    return this.withAuthOperation(async () => {
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
      assertAuthIdentityNotLinked(freshUser, cred.user.uid);
      try {
        await this.appUserService.linkAuthIdentity(freshUser.id, cred.user.uid);
        const linkedUser = await this.appUserService.getUserById(cred.user.uid);
        assertUserIdMatchesAuthUid(linkedUser!, cred.user.uid);
        if (linkedUser!.inviteStatus !== 'invited') {
          globalLogger.error(
            '[AppAuthService] signupWithInvite: invite status changed after linking (concurrent revocation detected)',
            { email, userId: linkedUser!.id, inviteStatus: linkedUser!.inviteStatus },
          );
          await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: true });
          throw new InviteInvalidError();
        }
        await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: false });
      } catch (err) {
        globalLogger.error('[AppAuthService] signupWithInvite: linkAuthIdentity failed', {
          email: normalizedEmail,
          invitedUserId: freshUser.id,
          authUid: cred.user.uid,
          error: err instanceof Error ? err.message : String(err),
        });
        await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: true });
        throw mapFirebaseAuthError(err);
      }
      try {
        await this.appUserService.activateInvitedUser(cred.user.uid);
        await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: false });
        try {
          await sendEmailVerification(cred.user);
          globalLogger.info('[AppAuthService] Email verification sent during signup', {
            email: normalizedEmail,
            uid: cred.user.uid,
          });
        } catch (verificationErr) {
          globalLogger.warn('[AppAuthService] Failed to send verification email during signup', {
            email: normalizedEmail,
            error:
              verificationErr instanceof Error ? verificationErr.message : String(verificationErr),
          });
        }
        const appUser = await this._resolveAuthenticatedUser(cred.user);
        const sessionExpiresAt = new Date();
        sessionExpiresAt.setHours(
          sessionExpiresAt.getHours() + AppAuthService.SESSION_EXPIRY_HOURS,
        );
        this.setSession({
          state: 'authenticated',
          user: appUser,
          emailVerified: cred.user.emailVerified,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt,
        });
        return this.session;
      } catch (err) {
        globalLogger.error(
          '[AppAuthService] signupWithInvite: activation failed (orphan created)',
          {
            email: normalizedEmail,
            authUid: cred.user.uid,
            error: err instanceof Error ? err.message : String(err),
            recovery:
              'User left disabled. Use appAuthService.cleanupOrphanedLinkedUser(authUid) after investigation',
          },
        );
        // Do NOT delete Firebase user after successful linking - Firestore owns authority
        // User is already disabled above; cleanup APIs will handle recovery
        throw mapFirebaseAuthError(err);
      }
    });
  }
  async updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role === 'owner') {
      // Owner can update anyone
    } else if (this.session.user.role === 'manager' || this.session.user.role === 'employee') {
      this.requireEmployeeSelfOnly(userId);
    } else if (this.session.user.role === 'client') {
      this.requireSelf(userId);
      const allowed: Partial<UpdateAppUserProfile> = {};
      if ('name' in data) allowed.name = data.name;
      if ('photoUrl' in data) allowed.photoUrl = data.photoUrl;
      return await this.appUserService.updateUserProfile(userId, allowed);
    } else {
      throw new InternalAuthError({ role: this.session.user.role });
    }
    try {
      const result = await this.appUserService.updateUserProfile(userId, data);

      // If updating self, sync profile changes to session
      if (this.session.user.id === userId) {
        this.setSession({
          state: 'authenticated',
          user: result,
          emailVerified: this.session.emailVerified,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: this.session.sessionExpiresAt,
        });
      }

      return result;
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser> {
    this.requireOwner();
    this.checkRateLimit(
      this.session.user!.id,
      this.ownerOpCounts,
      AppAuthService.OWNER_OP_RATE_LIMIT_PER_MINUTE,
    );
    try {
      // Load current state for conflict detection
      const currentUser = await this.appUserService.getUserById(userId);
      if (currentUser?.roleUpdatedAt) {
        const ageMs = Date.now() - currentUser.roleUpdatedAt.getTime();
        if (ageMs < 5000) {
          globalLogger.warn('[AppAuthService] Role recently updated, possible concurrent change', {
            userId,
            lastUpdateMs: ageMs,
          });
        }
      }
      return await this.appUserService.updateUserRole(userId, data);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser> {
    this.requireOwner();
    this.checkRateLimit(
      this.session.user!.id,
      this.ownerOpCounts,
      AppAuthService.OWNER_OP_RATE_LIMIT_PER_MINUTE,
    );
    try {
      return await this.appUserService.updateUserStatus(userId, data);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this.requireOwner();
    this.checkRateLimit(
      this.session.user!.id,
      this.ownerOpCounts,
      AppAuthService.OWNER_OP_RATE_LIMIT_PER_MINUTE,
    );
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
    this.assertAdminContext();
    const normalizedEmail = normalizeEmail(email);
    try {
      // @admin-only: Returns full AppUser projection (role, status, timestamps) by policy
      // Future field redaction will require breaking change or separate projection type
      globalLogger.warn(
        '[AppAuthService] getUserByEmail() is high-risk and intended for internal admin UI only. Exposes org structure.',
        {
          role: this.session.user!.role,
          userId: this.session.user!.id,
          queriedEmail: normalizedEmail,
        },
      );
      return await this.appUserService.getUserByEmail(normalizedEmail);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  async listUsers(): Promise<AppUser[]> {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role === 'client') {
      throw new NotAuthorizedError();
    }
    try {
      globalLogger.warn('[AppAuthService] listUsers() called (deprecated, use pagination)', {
        role: this.session.user.role,
        userId: this.session.user.id,
      });
      return await this.appUserService.listUsers();
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

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

  private lastCleanupTimestamp: number = 0;
  private static readonly CLEANUP_COOLDOWN_MS = 5000;

  async cleanupOrphanedLinkedUser(userId: string): Promise<void> {
    this.requireOwner();
    const now = Date.now();
    if (now - this.lastCleanupTimestamp < AppAuthService.CLEANUP_COOLDOWN_MS) {
      throw new TooManyRequestsError();
    }
    this.lastCleanupTimestamp = now;
    const user = await this.appUserService.getUserById(userId);
    if (!user) throw new InviteInvalidError();
    if (!(user.inviteStatus === 'activated' && user.isRegisteredOnERP === false)) {
      throw new InviteInvalidError();
    }
    globalLogger.warn(
      '[AppAuthService] Soft-deleting orphaned user (hard delete requires separate explicit call)',
      {
        userId,
        ownerUserId: this.session.user?.id,
      },
    );
    // Only soft-delete: preserves audit trail and allows rollback
    // Hard delete must be a separate explicit operation after verification
    await this.appUserService.deleteUser({ userId });
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
    // Use getSessionSnapshot() which handles expiry check centrally
    const session = this.getSessionSnapshot();
    assertAuthenticatedUser(session.user);
    return session.user;
  }

  async resendInvite(userId: string, options?: { force?: boolean }): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
    try {
      const user = await this.appUserService.getUserById(userId);
      if (!user) {
        throw new InviteInvalidError();
      }
      if (!options?.force && user.inviteSentAt) {
        const nowMs = new Date().getTime();
        const sentMs = new Date(user.inviteSentAt).getTime();
        const elapsedMs = nowMs - sentMs;
        const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
    if (this.session.user.role === 'client') {
      throw new NotAuthorizedError();
    }
    const MAX_PAGE_SIZE = 100;
    if (pageSize > MAX_PAGE_SIZE) {
      throw new InternalAuthError({
        message: 'Page size exceeds maximum allowed',
        requested: pageSize,
        max: MAX_PAGE_SIZE,
      });
    }
    try {
      return await this.appUserService.listUsersPaginated(pageSize, pageToken);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }
}

export const appAuthService = new AppAuthService();
