import { clientDb, clientStorage, globalLogger } from '@/lib';
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
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';
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
  InvalidInputError,
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
import { assertAppUserExistsForAuthUser, assertAuthenticatedUser } from './app-auth.invariants';
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
import { sessionRepository } from './session.repository';

/**
 * AppAuthService — Frozen v1
 *
 * This service is finalized and considered stable.
 * It is intentionally client-side and invariant-driven.
 * Behavior and limitations are documented and accepted.
 * No migration to backend enforcement or Admin SDK is planned.
 */

// Policy: Email normalization ensures consistency across module
// Uses lowercase and trim for reliable comparisons
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
  private currentSessionId: string | null = null;
  private sessionHeartbeatTimer: NodeJS.Timeout | null = null;
  private sessionExpiryWarningShown = false;
  private listeners: Set<(session: AuthSession) => void> = new Set();
  private appUserService = new AppUserService();
  private auth = getAuth();
  private storage = clientStorage;
  private db = clientDb;
  // Serialization: Session mutations are queued and executed sequentially
  private sessionMutationQueue: (() => Promise<void>)[] = [];
  private sessionMutationInProgress = false;
  private authMutationInProgress = false;
  private authMutationPromise: Promise<void> | null = null;
  // Chronological ordering: Include timestamp for reliable pending state ordering
  private pendingAuthStateChanges: Array<{ user: FirebaseUser | null; timestamp: number }> = [];
  private mutationStartTime = 0;
  private unsubscribeAuthState: (() => void) | null = null;
  private sessionExpiryTimer: NodeJS.Timeout | null = null;
  // Concurrency guard: Prevents duplicate timer creation
  private sessionExpiryTimerStarted = false;
  // Cleanup tracking: Pending timers tracked for disposal
  private pendingReplayTimers: Set<NodeJS.Timeout> = new Set();
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
  private static readonly SESSION_HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private static readonly MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  private static readonly ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly PHOTO_EXTENSIONS = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  private static readonly MIN_PASSWORD_LENGTH = 8;
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

    // Cleanup expired entries lazily: Only clean when checking this user
    // Avoids O(n) cleanup on every call; entries are cleaned as needed
    const limit = limitsMap.get(userId);
    if (limit && now >= limit.resetAt) {
      // This user's limit expired, clean it up
      limitsMap.delete(userId);
    }

    const currentLimit = limitsMap.get(userId);
    if (currentLimit && now < currentLimit.resetAt) {
      if (currentLimit.count >= maxPerMinute) {
        throw new TooManyRequestsError();
      }
      currentLimit.count++;
    } else {
      limitsMap.set(userId, { count: 1, resetAt: now + 60 * 1000 });
    }
  }

  /**
   * Create a new session in Firestore for cross-device session tracking.
   * Returns the session ID.
   */
  private async createSession(userId: string): Promise<string> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + AppAuthService.SESSION_EXPIRY_HOURS);

    const deviceInfo =
      typeof window !== 'undefined'
        ? {
            userAgent: window.navigator.userAgent,
            platform: window.navigator.platform,
          }
        : undefined;

    try {
      const session = await sessionRepository.create({
        userId,
        lastSeenAt: new Date(),
        expiresAt,
        revoked: false,
        deviceInfo,
      });

      globalLogger.info('[AppAuthService] Session created in Firestore', {
        sessionId: session.id,
        userId,
        expiresAt,
      });

      return session.id;
    } catch (err) {
      globalLogger.error('[AppAuthService] Failed to create session in Firestore', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Don't fail auth if session creation fails - session tracking is non-critical
      throw err;
    }
  }

  /**
   * Destroy the current session in Firestore.
   */
  private async destroySession(sessionId: string): Promise<void> {
    if (!sessionId) return;

    try {
      await sessionRepository.delete(sessionId);
      globalLogger.info('[AppAuthService] Session destroyed in Firestore', { sessionId });
    } catch (err) {
      globalLogger.warn('[AppAuthService] Failed to destroy session in Firestore', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Don't fail logout if session destruction fails
    }
  }

  /**
   * Start sending periodic heartbeats to keep the session alive in Firestore.
   */
  private startSessionHeartbeat(): void {
    if (this.sessionHeartbeatTimer) {
      clearInterval(this.sessionHeartbeatTimer);
    }

    this.sessionHeartbeatTimer = setInterval(async () => {
      if (!this.currentSessionId || this.session.state !== 'authenticated') {
        this.stopSessionHeartbeat();
        return;
      }

      try {
        await sessionRepository.updateHeartbeat(this.currentSessionId);
        globalLogger.debug('[AppAuthService] Session heartbeat sent', {
          sessionId: this.currentSessionId,
        });

        // Also check if session was revoked
        await this.validateCurrentSession();
      } catch (err) {
        globalLogger.warn('[AppAuthService] Session heartbeat failed', {
          sessionId: this.currentSessionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, AppAuthService.SESSION_HEARTBEAT_INTERVAL_MS);

    globalLogger.info('[AppAuthService] Session heartbeat started', {
      interval: AppAuthService.SESSION_HEARTBEAT_INTERVAL_MS,
    });
  }

  /**
   * Stop sending session heartbeats.
   */
  private stopSessionHeartbeat(): void {
    if (this.sessionHeartbeatTimer) {
      clearInterval(this.sessionHeartbeatTimer);
      this.sessionHeartbeatTimer = null;
      globalLogger.info('[AppAuthService] Session heartbeat stopped');
    }
  }

  /**
   * Validate the current session in Firestore.
   * If session is revoked or expired, force logout.
   */
  private async validateCurrentSession(): Promise<void> {
    if (!this.currentSessionId || this.session.state !== 'authenticated') {
      return;
    }

    try {
      const session = await sessionRepository.getById(this.currentSessionId);

      if (!session) {
        globalLogger.warn('[AppAuthService] Session not found in Firestore, forcing logout', {
          sessionId: this.currentSessionId,
        });
        this.currentSessionId = null;
        this.stopSessionHeartbeat();

        // Clear server-side session cookie immediately
        try {
          await this.clearSessionCookie();
          globalLogger.info('[AppAuthService] Session cookie cleared for missing session');
        } catch (cookieErr) {
          globalLogger.error('[AppAuthService] Failed to clear cookie for missing session', {
            error: cookieErr instanceof Error ? cookieErr.message : String(cookieErr),
          });
        }

        // Add small delay to ensure cookie deletion propagates
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Set error state for UI notification
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: {
            error: new Error('Your session is no longer valid. Please sign in again.'),
            timestamp: new Date(),
          },
          sessionExpiresAt: null,
        });
        return;
      }

      if (session.revoked) {
        globalLogger.warn('[AppAuthService] Session revoked by admin, forcing logout', {
          sessionId: this.currentSessionId,
          revokedAt: session.revokedAt,
        });
        this.currentSessionId = null;
        this.stopSessionHeartbeat();

        // Clear server-side session cookie immediately
        try {
          await this.clearSessionCookie();
          globalLogger.info('[AppAuthService] Session cookie cleared for revoked session');
        } catch (cookieErr) {
          globalLogger.error('[AppAuthService] Failed to clear cookie for revoked session', {
            error: cookieErr instanceof Error ? cookieErr.message : String(cookieErr),
          });
        }

        // Add small delay to ensure cookie deletion propagates
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Set UserDisabledError for UI to show appropriate message
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: {
            error: new UserDisabledError(),
            timestamp: new Date(),
          },
          sessionExpiresAt: null,
        });
        return;
      }

      if (session.expiresAt && new Date() > session.expiresAt) {
        globalLogger.warn('[AppAuthService] Session expired, forcing logout', {
          sessionId: this.currentSessionId,
          expiresAt: session.expiresAt,
        });
        this.currentSessionId = null;
        this.stopSessionHeartbeat();
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: {
            error: new Error('Your session has expired. Please sign in again.'),
            timestamp: new Date(),
          },
          sessionExpiresAt: null,
        });
        return;
      }
    } catch (err) {
      globalLogger.error('[AppAuthService] Session validation failed', {
        sessionId: this.currentSessionId,
        error: err instanceof Error ? err.message : String(err),
      });
      // Don't force logout on validation errors - could be transient network issue
    }
  }

  private async withAuthOperation<T>(fn: () => Promise<T>): Promise<T> {
    if (this.authMutationInProgress && this.authMutationPromise) {
      // Prevent timer leak: Track timeout and clear whether promise resolves or rejects
      let timeoutId: NodeJS.Timeout | null = null;
      const waitPromise = Promise.race([
        this.authMutationPromise,
        new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Timed out waiting for previous auth operation')),
            AppAuthService.WAIT_FOR_MUTATION_TIMEOUT_MS,
          );
        }),
      ]);
      try {
        await waitPromise;
      } catch (err) {
        globalLogger.error('[AppAuthService] Previous auth operation failed or timed out', {
          error: err,
        });
      } finally {
        // Clear timeout whether promise resolved or rejected
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
      }
    }
    this.authMutationInProgress = true;
    this.mutationStartTime = Date.now();

    // Pause session expiry timer during mutation to prevent forced logout
    // Resume after mutation completes
    const wasTimerActive = this.sessionExpiryTimer !== null;
    if (wasTimerActive && this.sessionExpiryTimer) {
      clearInterval(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }

    let timeoutTriggered = false;
    const timeoutHandle = setTimeout(async () => {
      timeoutTriggered = true;
      // Reset flags IMMEDIATELY before async operations to prevent race conditions
      // If we wait until after firebaseSignOut(), another operation could start during await
      this.authMutationInProgress = false;
      this.authMutationPromise = null;

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
      // Clear session expiry timer on timeout
      if (this.sessionExpiryTimer) {
        clearInterval(this.sessionExpiryTimer);
        this.sessionExpiryTimer = null;
      }
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

        // Resume session expiry timer if it was active before
        if (wasTimerActive && this.session.state === 'authenticated') {
          this.setupSessionExpiryTimer();
        }

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
          // Sort by timestamp and replay all changes, deduplicating by UID
          const sortedChanges = pendingChanges.sort((a, b) => a.timestamp - b.timestamp);
          const currentUser = this.auth.currentUser;
          const currentUid = currentUser?.uid;
          let lastReplayedUid = currentUid;

          for (const change of sortedChanges) {
            const pendingUid = change.user?.uid;
            if (pendingUid !== lastReplayedUid) {
              // UID changed, this is a real state transition
              lastReplayedUid = pendingUid;
              // Track timer ID for cleanup on disposal
              // Await async handleAuthStateChanged to prevent unhandled rejections
              const timerId = setTimeout(async () => {
                this.pendingReplayTimers.delete(timerId);
                try {
                  await this.handleAuthStateChanged(change.user);
                } catch (err) {
                  globalLogger.error('[AppAuthService] Error in replayed auth state change', {
                    error: err instanceof Error ? err.message : String(err),
                  });
                }
              }, 0);
              this.pendingReplayTimers.add(timerId);
            } else {
              // Same UID, skip redundant
              globalLogger.debug('[AppAuthService] Skipping redundant auth state replay', {
                uid: pendingUid,
              });
            }
          }
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

  /**
   * Normalize and validate image input.
   * Accepts File or base64 data URI string.
   * Returns blob with extracted MIME type and extension.
   * @throws InvalidInputError if validation fails
   */
  private async normalizeImageInput(
    input: File | string,
  ): Promise<{ blob: Blob; mime: string; extension: string }> {
    let blob: Blob;
    let mime = '';

    if (typeof input === 'string') {
      // Parse base64 data URI
      const match = input.match(/^data:([a-z0-9\/+]+);base64,(.+)$/);
      if (!match || !match[1] || !match[2]) {
        throw new InvalidInputError('Invalid base64 data URI format');
      }
      mime = match[1];
      const base64 = match[2];

      // Validate MIME type
      if (!AppAuthService.ALLOWED_PHOTO_MIMES.includes(mime)) {
        throw new InvalidInputError(
          `Image MIME type must be one of: ${AppAuthService.ALLOWED_PHOTO_MIMES.join(', ')}`,
        );
      }

      // Decode and validate size
      const binary = atob(base64);
      if (binary.length > AppAuthService.MAX_PHOTO_SIZE_BYTES) {
        throw new InvalidInputError(
          `Image size exceeds ${AppAuthService.MAX_PHOTO_SIZE_BYTES / (1024 * 1024)}MB limit`,
        );
      }

      // Create blob from binary
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: mime });
    } else if (input instanceof File) {
      blob = input;
      mime = input.type;

      // Validate MIME type
      if (!AppAuthService.ALLOWED_PHOTO_MIMES.includes(mime)) {
        throw new InvalidInputError(
          `Image MIME type must be one of: ${AppAuthService.ALLOWED_PHOTO_MIMES.join(', ')}`,
        );
      }

      // Validate file extension matches expected image types
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const fileExtension = '.' + (input.name.split('.').pop() || '').toLowerCase();
      if (!validExtensions.includes(fileExtension)) {
        throw new InvalidInputError(
          `Invalid image extension: ${fileExtension}. Supported: ${validExtensions.join(', ')}`,
        );
      }

      // Validate size
      if (blob.size > AppAuthService.MAX_PHOTO_SIZE_BYTES) {
        throw new InvalidInputError(
          `Image size exceeds ${AppAuthService.MAX_PHOTO_SIZE_BYTES / (1024 * 1024)}MB limit`,
        );
      }
    } else {
      throw new InvalidInputError('Photo input must be File or base64 data URI');
    }

    // Extract extension from MIME type
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const extension = extensionMap[mime];
    if (!extension) {
      throw new InvalidInputError(`Unsupported MIME type: ${mime}`);
    }

    return { blob, mime, extension };
  }

  /**
   * Resize image to 1024x1024 for profile photos
   */
  private async resizeProfilePhoto(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);

        const targetSize = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Fill white background for JPEG
        if (blob.type === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetSize, targetSize);
        }

        // Calculate scaling to fit image maintaining aspect ratio
        const scale = Math.min(targetSize / img.width, targetSize / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        // Center the image
        const offsetX = (targetSize - scaledWidth) / 2;
        const offsetY = (targetSize - scaledHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

        canvas.toBlob(
          (resizedBlob) => {
            if (resizedBlob) {
              resolve(resizedBlob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          blob.type,
          0.9,
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Upload user profile photo to deterministic Firebase Storage path.
   * Overwrites any existing photo at the same path.
   * @returns Download URL for the uploaded photo
   * @throws AuthInfrastructureError on upload failure
   */
  private async uploadUserProfilePhoto(userId: string, input: File | string): Promise<string> {
    try {
      const { blob, extension } = await this.normalizeImageInput(input);

      // Resize to 1024x1024 for profile photos
      const resizedBlob = await this.resizeProfilePhoto(blob);

      // Deterministic path: user-photos/{userId}/profile.{ext}
      const storagePath = `user-photos/${userId}/profile.${extension}`;
      const fileRef = ref(this.storage, storagePath);

      // Upload (overwrites if exists)
      await uploadBytes(fileRef, resizedBlob);

      // Get download URL
      const downloadUrl = await getDownloadURL(fileRef);
      return downloadUrl;
    } catch (err) {
      if (err instanceof InvalidInputError) {
        throw err;
      }
      throw new AuthInfrastructureError(`Failed to upload profile photo for user ${userId}`, err);
    }
  }

  /**
   * Delete user profile photo from Firebase Storage.
   * Logs warning (not error) if file doesn't exist.
   * Wraps errors in AuthInfrastructureError.
   * @throws AuthInfrastructureError only if operation itself fails
   * Policy: Use deterministic naming to delete specific files (avoids O(n) folder listing)
   */
  private async deleteUserProfilePhoto(userId: string): Promise<void> {
    // Deterministic file deletion: Try common extensions sequentially
    // More efficient than listing folder; single file expected per user
    const commonExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    for (const ext of commonExtensions) {
      try {
        const fileRef = ref(this.storage, `user-photos/${userId}/profile.${ext}`);
        await deleteObject(fileRef);
        globalLogger.info('[AppAuthService] Deleted profile photo', {
          userId,
          extension: ext,
        });
        // File found and deleted - no need to try other extensions
        return;
      } catch (deleteErr: any) {
        // 'storage/object-not-found' is expected if file doesn't exist with this extension
        if (deleteErr?.code !== 'storage/object-not-found') {
          globalLogger.warn('[AppAuthService] Failed to delete profile photo file', {
            userId,
            extension: ext,
            error: deleteErr,
          });
        }
        // Continue trying other extensions
      }
    }
    // All extensions tried, none existed - this is normal
    globalLogger.debug('[AppAuthService] No profile photo found to delete', { userId });
  }

  /**
   * INTERNAL: Delete all user storage (for future hard-delete operations).
   * Not exposed in public API - reserved for explicit owner maintenance operations.
   * Called only by owner-initiated hard-delete workflows.
   */
  private async deleteAllUserStorage(userId: string): Promise<void> {
    try {
      // Delete user-photos/{userId}/* folder and all contents
      const userPhotosRef = ref(this.storage, `user-photos/${userId}`);
      const { items } = await listAll(userPhotosRef);

      for (const item of items) {
        try {
          await deleteObject(item);
        } catch (deleteErr) {
          globalLogger.warn('[AppAuthService] Failed to delete user storage object', {
            userId,
            path: item.fullPath,
            error: deleteErr,
          });
        }
      }

      globalLogger.info('[AppAuthService] User storage deleted', { userId });
    } catch (err) {
      globalLogger.warn('[AppAuthService] Could not fully delete user storage', {
        userId,
        error: err,
      });
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
    // Defensive validation: Check error code property exists before accessing
    // Prevents crashes from malformed error objects
    const errCode = (err as any).code;
    if (typeof errCode !== 'string') return false;
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
          const delayMs = Math.min(1000 * Math.pow(2, attempt), 5000); // Cap at 5s per attempt
          // Add jitter to prevent thundering herd: ±10% of delay
          // Desynchronizes retries across multiple clients
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
    // After mutations like owner signup, Firestore writes may have consistency delays
    // Use more retries to give the backend time to propagate writes
    let appUser: AppUser | null = null;
    try {
      appUser = await this.retryWithBackoff(
        () => this.appUserService.getUserById(firebaseUser.uid),
        'getUserById',
        5, // Increased from 3 to 5 retries (total ~31s with exponential backoff)
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

    assertAppUserExistsForAuthUser(true, appUser);
    if (!appUser) {
      throw new AuthInvariantViolationError(
        'Invariant: appUser must not be null after assertAppUserExistsForAuthUser',
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
      let signOutFailed = false;

      // Stop session heartbeat
      this.stopSessionHeartbeat();

      // Destroy session in Firestore
      if (this.currentSessionId) {
        try {
          await this.destroySession(this.currentSessionId);
          this.currentSessionId = null;
        } catch (err) {
          globalLogger.warn('[AppAuthService] Failed to destroy session during sign out', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      try {
        // Clear session cookie first
        await this.clearSessionCookie();
        await firebaseSignOut(this.auth);
      } catch (err) {
        // BUG #19 FIX: Log sign-out failure separately; continue with local logout
        signOutFailed = true;
        globalLogger.warn(
          '[AppAuthService] Firebase sign-out failed, but continuing with local logout',
          {
            error: err instanceof Error ? err.message : String(err),
          },
        );
      }
      // Always update session (local logout always succeeds)
      this.setSession({
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
        sessionExpiresAt: null,
      });
      // BUG #11 FIX: Report sign-out failure if it occurred
      if (signOutFailed) {
        globalLogger.error(
          '[AppAuthService] Sign-out partial failure: Firebase sign-out failed but local session cleared',
          { severity: 'warning', consequence: 'Next sign-in may see existing Firebase session' },
        );
      }
    });
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    // MISSED-006 FIX: Normalize email at API boundary
    const normalizedEmail = normalizeEmail(email);
    return this.withAuthOperation(async () => {
      try {
        // See AUTH_MODEL.md
        // BUG #13 FIX: Rate limit per unique session/IP, not per email
        // Email addresses are public and can be enumerated; keying on them enables DoS
        // Instead, limit per authenticated user (if logged in) or per Firebase Auth attempt
        const resetLimitKey = this.auth.currentUser?.uid || `anon:${normalizedEmail}`;
        const now = Date.now();
        // BUG #8 FIX: Improve atomic check-and-increment for rate limiting
        // Note: Single-instance deployment only; multi-instance requires Firestore atomicity
        const resetLimit = this.passwordResetCounts.get(resetLimitKey);
        let currentCount = 0;

        if (resetLimit && now < resetLimit.resetAt) {
          currentCount = resetLimit.count;
          if (currentCount >= AppAuthService.PASSWORD_RESET_RATE_LIMIT_PER_HOUR) {
            globalLogger.warn('[AppAuthService] Password reset rate limit exceeded', {
              key: resetLimitKey.substring(0, 10), // Don't log full email/uid
              attemptsThisHour: currentCount,
              limit: AppAuthService.PASSWORD_RESET_RATE_LIMIT_PER_HOUR,
            });
            throw new TooManyRequestsError();
          }
          // Increment the counter
          resetLimit.count = currentCount + 1;
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
    // NEW-046 FIX: Atomic timer setup to prevent duplicate timers from concurrent calls
    if (this.sessionExpiryTimerStarted) return;

    // Clear old timer if it exists
    if (this.sessionExpiryTimer) {
      clearInterval(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }

    // Mark as started BEFORE creating interval to prevent concurrent setups
    this.sessionExpiryTimerStarted = true;

    // BUG #10 FIX: Active session expiry enforcement via background timer
    // BUG #27 FIX: Stop timer when session ends to prevent resource leaks
    // ENHANCEMENT: Check for disabled status every 2 seconds for faster detection
    this.sessionExpiryTimer = setInterval(async () => {
      // Stop timer when logged out to save resources
      if (this.session.state !== 'authenticated') {
        if (this.sessionExpiryTimer) {
          clearInterval(this.sessionExpiryTimer);
          this.sessionExpiryTimer = null;
        }
        // NEW-046 FIX: Reset flag only after interval is cleared
        this.sessionExpiryTimerStarted = false;
        return;
      }

      // Check session expiry
      if (this.session.sessionExpiresAt) {
        const now = new Date();
        const expiresAt = this.session.sessionExpiresAt;
        const timeUntilExpiry = expiresAt.getTime() - now.getTime();
        const fiveMinutes = 5 * 60 * 1000;

        // Session expiry warning: 5 minutes before expiry
        if (
          timeUntilExpiry > 0 &&
          timeUntilExpiry <= fiveMinutes &&
          !this.sessionExpiryWarningShown
        ) {
          this.sessionExpiryWarningShown = true;
          const minutesRemaining = Math.ceil(timeUntilExpiry / 60000);
          globalLogger.info('[AppAuthService] Session expiring soon, notifying user', {
            minutesRemaining,
          });
          // Emit warning by setting a temporary auth error that UI can detect
          // This doesn't log out the user, just notifies them
          this.listeners.forEach((cb) => {
            try {
              cb({
                ...this.session,
                lastAuthError: {
                  error: new Error(`SESSION_EXPIRING:${minutesRemaining}`),
                  timestamp: new Date(),
                },
              });
            } catch (err) {
              globalLogger.warn('[AppAuthService] Listener error for expiry warning', {
                error: err instanceof Error ? err.message : String(err),
              });
            }
          });
        }

        if (now > expiresAt) {
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
            lastAuthError: {
              error: new Error('Your session has expired. Please sign in again.'),
              timestamp: new Date(),
            },
            sessionExpiresAt: null,
          });
          // Timer will self-stop on next iteration when state !== 'authenticated'
          return;
        }
      }

      // INSTANT LOGOUT: Check if user has been disabled (every 5 seconds)
      // This ensures disabled users are logged out even if they don't trigger any other checks
      if (this.session.user) {
        try {
          // Validate session in Firestore for cross-device logout
          await this.validateCurrentSession();

          // Check if user has been disabled in Firestore
          const freshUser = await this.appUserService.getUserById(this.session.user.id);
          if (freshUser && freshUser.isDisabled) {
            globalLogger.warn('[AppAuthService] User disabled by owner; forcing instant logout', {
              userId: this.session.user.id,
            });
            // Force sign out from Firebase Auth
            try {
              await firebaseSignOut(this.auth);
            } catch (signOutErr) {
              globalLogger.error('[AppAuthService] Failed to sign out disabled user', {
                error: signOutErr instanceof Error ? signOutErr.message : String(signOutErr),
              });
            }
            // Clear server-side session cookie to prevent redirect loops
            // IMPORTANT: Wait for cookie to be cleared before updating session state
            // to prevent race conditions with client-side navigation
            try {
              await this.clearSessionCookie();
              globalLogger.info('[AppAuthService] Session cookie cleared for disabled user');
            } catch (cookieErr) {
              globalLogger.error(
                '[AppAuthService] Failed to clear session cookie for disabled user',
                {
                  error: cookieErr instanceof Error ? cookieErr.message : String(cookieErr),
                },
              );
            }
            // Add small delay to ensure cookie deletion propagates
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Clear session - this will trigger redirect in UI
            this.setSession({
              state: 'unauthenticated',
              user: null,
              emailVerified: null,
              lastTransitionError: null,
              lastAuthError: {
                error: new UserDisabledError(),
                timestamp: new Date(),
              },
              sessionExpiresAt: null,
            });
            // Timer will self-stop on next iteration
          }
        } catch (err) {
          // Don't crash the timer if disabled check fails
          // User will be caught by other mechanisms (middleware, token refresh, etc.)
          globalLogger.warn('[AppAuthService] Failed to check disabled status in background', {
            userId: this.session.user.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }, 5000); // Check every 5 seconds
  }

  dispose() {
    if (this.unsubscribeAuthState) {
      this.unsubscribeAuthState();
      this.unsubscribeAuthState = null;
    }
    // Stop heartbeat timer
    this.stopSessionHeartbeat();
    // MISSED-003 FIX: Clear pending auth state changes to prevent memory leak
    this.pendingAuthStateChanges = [];
    // NEW-065 FIX: Clear pending replay timers to prevent post-disposal execution
    for (const timerId of this.pendingReplayTimers) {
      clearTimeout(timerId);
    }
    this.pendingReplayTimers.clear();
    // BUG #8 FIX: Clear rate limit maps to prevent memory leaks
    this.ownerOpCounts.clear();
    this.passwordOpCounts.clear();
    this.passwordResetCounts.clear();
    // BUG #10 FIX: Clear session expiry timer
    if (this.sessionExpiryTimer) {
      clearInterval(this.sessionExpiryTimer);
      this.sessionExpiryTimer = null;
    }
    // NEW-068 FIX: Reset timer started flag to ensure clean disposal state
    this.sessionExpiryTimerStarted = false;
    this.listeners.clear();
  }

  constructor() {
    // BUG #9 FIX: Wrap auth state listener to catch promise rejections
    const unsubscribe = onAuthStateChanged(this.auth, async (firebaseUser) => {
      try {
        await this.handleAuthStateChanged(firebaseUser);
      } catch (err) {
        globalLogger.error('[AppAuthService] Unhandled error in handleAuthStateChanged', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
    this.unsubscribeAuthState = unsubscribe;
    // BUG #10 FIX: Start background timer to enforce session expiry
    this.setupSessionExpiryTimer();
  }

  /**
   * Syncs the Firebase Auth ID token to a server-side session cookie.
   * This enables middleware-based auth checks that prevent page flashing.
   */
  private async syncTokenToCookie(firebaseUser: FirebaseUser): Promise<void> {
    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent/received
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        globalLogger.error('[AppAuthService] Failed to sync token to cookie', {
          status: response.status,
          statusText: response.statusText,
        });
        // Log response body for debugging
        const responseText = await response.text();
        globalLogger.error('[AppAuthService] Login API response', { body: responseText });
      } else {
        globalLogger.info('[AppAuthService] Successfully synced token to cookie');
      }
    } catch (err) {
      // Don't throw - cookie sync failure shouldn't break auth flow
      globalLogger.error('[AppAuthService] Error syncing token to cookie', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Clears the server-side session cookie.
   */
  private async clearSessionCookie(): Promise<void> {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        globalLogger.error('[AppAuthService] Failed to clear session cookie', {
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (err) {
      // Don't throw - cookie clear failure shouldn't break auth flow
      globalLogger.error('[AppAuthService] Error clearing session cookie', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private handleAuthStateChanged = async (firebaseUser: FirebaseUser | null) => {
    // Queue auth state changes during mutations instead of ignoring them
    // This prevents masking legitimate changes (signout from another tab, token invalidation, etc.)
    // Queued changes are replayed once the mutation completes
    if (this.authMutationInProgress) {
      // NEW-040 FIX: Queue ALL auth state changes, not just the most recent
      // Deduplicate consecutive identical states at replay time to prevent state churn
      this.pendingAuthStateChanges.push({ user: firebaseUser, timestamp: Date.now() });
      globalLogger.info('[AppAuthService] Auth state change queued during mutation', {
        hasUser: firebaseUser !== null,
      });
      return;
    }
    try {
      if (!firebaseUser) {
        // Don't immediately transition to unauthenticated from 'unknown' state
        // Firebase Auth may still be rehydrating from persistence after a page load
        // Wait a moment to avoid race conditions with cookie-based auth
        if (this.session.state === 'unknown') {
          // Give Firebase Auth a chance to rehydrate before marking as unauthenticated
          await new Promise((resolve) => setTimeout(resolve, 500));
          // Check again if user appeared during the wait
          const currentUser = this.auth.currentUser;
          if (currentUser) {
            // User appeared, let the next auth state change handle it
            return;
          }
        }

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

      // Only transition to authenticating if coming from unauthenticated or unknown
      // If already authenticated, skip to avoid invalid transition (e.g., during token refresh)
      if (this.session.state === 'unauthenticated' || this.session.state === 'unknown') {
        this.setSession({
          state: 'authenticating',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
      }

      const appUser = await this._resolveAuthenticatedUser(firebaseUser);
      const sessionExpiresAt = new Date();
      sessionExpiresAt.setHours(sessionExpiresAt.getHours() + AppAuthService.SESSION_EXPIRY_HOURS);

      // Sync ID token to session cookie (for cases like page refresh)
      await this.syncTokenToCookie(firebaseUser);

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
      } catch (err) {
        // BUG #7 FIX: Log listener errors instead of silently swallowing
        globalLogger.warn('[AppAuthService] Listener error (continuing)', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
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
  /**
   * BUG #4 FIX: Explicitly check if session has expired
   * Use this for expiry validation instead of accessing session state directly
   */
  hasSessionExpired(session?: AuthSession): boolean {
    const sessionToCheck = session || this.session;
    if (
      sessionToCheck.state === 'authenticated' &&
      sessionToCheck.sessionExpiresAt &&
      new Date() > sessionToCheck.sessionExpiresAt
    ) {
      return true;
    }
    return false;
  }

  /**
   * MISSED-002 FIX: Consolidated session expiry enforcement
   * Ensures consistent expiry logic across the service (replaces manual checks)
   */
  checkAndEnforceSessionExpiry(): void {
    if (this.hasSessionExpired()) {
      globalLogger.warn(
        '[AppAuthService] checkAndEnforceSessionExpiry: Session expired, enforcing logout',
      );
      this.setSession({
        state: 'unauthenticated',
        user: null,
        emailVerified: null,
        lastTransitionError: null,
        lastAuthError: null,
        sessionExpiresAt: null,
      });
    }
  }

  getSessionSnapshot(): AuthSession {
    // NEW-054 FIX: Document that session snapshot is cached and potentially stale
    // Expiry is checked at most once per second. Callers requiring strict auth checks
    // should call checkAndEnforceSessionExpiry() before protected operations.
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
    // Use snapshot to respect session expiry state
    const snapshot = this.getSessionSnapshot();
    // Defensive null check for consistency
    return snapshot?.lastAuthError ?? null;
  }

  onAuthStateChanged(callback: (session: AuthSession) => void): UnsubscribeFn {
    this.listeners.add(callback);

    // Auto-cleanup unused listeners after 5 minutes to prevent memory leak
    const listenerTimeout = setTimeout(
      () => {
        if (this.listeners.has(callback)) {
          globalLogger.warn('[AppAuthService] Listener auto-removed due to inactivity timeout');
          this.listeners.delete(callback);
        }
      },
      5 * 60 * 1000,
    ); // 5 minute timeout

    // Clear timeout when unsubscribe is called to prevent closure from keeping callback alive
    return () => {
      clearTimeout(listenerTimeout);
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
          // Transition through authenticating state to maintain state machine validity
          // Only transition if not already in authenticating or authenticated state
          if (this.session.state !== 'authenticating' && this.session.state !== 'authenticated') {
            this.setSession({
              state: 'authenticating',
              user: null,
              emailVerified: null,
              lastTransitionError: null,
              lastAuthError: null,
              sessionExpiresAt: null,
            });
          }
          // Now set to authenticated
          this.setSession({
            state: 'authenticated',
            user: { ...user, lastLoginAt: new Date() },
            emailVerified: cred.user.emailVerified,
            lastTransitionError: null,
            lastAuthError: null,
            sessionExpiresAt,
          });

          // Create session in Firestore and start heartbeat
          try {
            this.currentSessionId = await this.createSession(user.id);
            this.startSessionHeartbeat();
            this.sessionExpiryWarningShown = false; // Reset warning flag
          } catch (sessionErr) {
            globalLogger.warn('[AppAuthService] Failed to create session during owner sign up', {
              error: sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
            });
          }

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
      // If already authenticated, sign out first to ensure clean state
      if (this.session.state === 'authenticated') {
        globalLogger.info(
          '[AppAuthService] User already authenticated, signing out before sign-in',
        );
        try {
          await firebaseSignOut(this.auth);
          // Explicitly set state to unauthenticated after sign out to allow transition to authenticating
          this.setSession({
            state: 'unauthenticated',
            user: null,
            emailVerified: null,
            lastTransitionError: null,
            lastAuthError: null,
            sessionExpiresAt: null,
          });
          // Wait for state to settle
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          globalLogger.warn('[AppAuthService] Pre-signin logout failed', { error: err });
        }
      }

      // Only transition to authenticating if not already in that state
      if (this.session.state !== 'authenticating') {
        this.setSession({
          state: 'authenticating',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
      }
      const normalizedEmail = normalizeEmail(email);
      try {
        const cred = await signInWithEmailAndPassword(this.auth, normalizedEmail, password);
        const appUser = await this._resolveAuthenticatedUser(cred.user);
        const sessionExpiresAt = new Date();
        sessionExpiresAt.setHours(
          sessionExpiresAt.getHours() + AppAuthService.SESSION_EXPIRY_HOURS,
        );

        // Sync ID token to session cookie
        await this.syncTokenToCookie(cred.user);

        this.setSession({
          state: 'authenticated',
          user: appUser,
          emailVerified: cred.user.emailVerified,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt,
        });

        // Create session in Firestore and start heartbeat
        try {
          this.currentSessionId = await this.createSession(appUser.id);
          this.startSessionHeartbeat();
          this.sessionExpiryWarningShown = false; // Reset warning flag
        } catch (sessionErr) {
          globalLogger.warn('[AppAuthService] Failed to create session during sign in', {
            error: sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
          });
        }

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
        // Log the actual error before mapping for debugging
        globalLogger.error('[AppAuthService] Sign in failed', {
          email: normalizedEmail,
          errorCode: (err as any)?.code,
          errorMessage: err instanceof Error ? err.message : String(err),
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
    // BUG #18 FIX: Validate password meets strength requirements
    // Firebase requires: min 6 chars, no obvious patterns
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /[0-9]/.test(newPassword);
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      throw new WeakPasswordError('Password must contain uppercase, lowercase, and numbers');
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

      // NEW-044 FIX: Validate password format BEFORE rate limit check
      // so invalid attempts don't count against the rate limit
      if (newPassword.length < AppAuthService.MIN_PASSWORD_LENGTH) {
        throw new InvalidInputError(
          `Password must be at least ${AppAuthService.MIN_PASSWORD_LENGTH} characters`,
        );
      }
      if (newPassword === currentPassword) {
        throw new InvalidInputError('New password must be different from current password');
      }
      // NEW-057 FIX: Enforce consistent password strength requirements matching confirmPasswordReset
      const hasUpperCase = /[A-Z]/.test(newPassword);
      const hasLowerCase = /[a-z]/.test(newPassword);
      const hasNumbers = /[0-9]/.test(newPassword);
      if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
        throw new WeakPasswordError('Password must contain uppercase, lowercase, and numbers');
      }

      try {
        const cred = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPassword);
        // NEW-044 FIX: Rate limit check occurs AFTER successful auth/validation
        this.checkRateLimit(
          user.uid,
          this.passwordOpCounts,
          AppAuthService.PASSWORD_CHANGE_RATE_LIMIT_PER_MINUTE,
        );
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }
    });
  }

  async getCurrentUser(): Promise<AppUser | null> {
    const session = await this.waitForResolvedSession();
    return session.user;
  }

  async updateOwnerProfile(data: {
    name?: string;
    photoUrl?: string | File | { url?: string; file?: File } | null;
  }): Promise<AppUser> {
    this.requireOwner();
    const user = this.session.user;
    assertAuthenticatedUser(user);
    try {
      let updated = user;

      if (data.name !== undefined) {
        updated = await this.updateUserProfile(user.id, { name: data.name });
      }

      if (data.photoUrl !== undefined) {
        let photoInput: File | string | undefined;
        const raw = data.photoUrl as unknown;

        if (raw === '' || raw === null) {
          photoInput = undefined;
        } else if (raw instanceof File) {
          photoInput = raw;
        } else if (typeof raw === 'string') {
          photoInput = raw;
        } else if (typeof raw === 'object' && raw !== null) {
          const file = (raw as { file?: File }).file;
          const url = (raw as { url?: string }).url;
          if (file instanceof File) {
            photoInput = file;
          } else if (typeof url === 'string') {
            photoInput = url;
          }
        }

        updated = await this.updateUserPhoto(user.id, photoInput);
      }

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
      // NEW-055 FIX: Validate email format after normalization to catch any malformed emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedData.email)) {
        throw new InvalidInputError('Email format is invalid after normalization');
      }
      // BUG #22 FIX: Check email uniqueness before creating invite
      const existingUser = await this.appUserService.getUserByEmail(normalizedData.email);
      if (existingUser) {
        throw new InternalAuthError({ message: 'Email already in use by another user' });
      }
      // NEW-042 FIX: Also check deleted users to prevent re-invitation with same email
      const result = await this.appUserService.searchUsers({ email: normalizedData.email }, 1);
      // searchUsers doesn't include deleted, so search manually
      try {
        const maybeDeleted = await this.appUserService['appUserRepo'].find({
          where: [['email', '==', normalizedData.email]],
          limit: 1,
        });
        if (maybeDeleted.data.length > 0) {
          throw new InternalAuthError({
            message: 'Email previously used (even if deleted). Cannot re-invite.',
          });
        }
      } catch (err) {
        // If search fails, proceed anyway (err already handled)
      }
      const user = await this.appUserService.createUser(normalizedData);
      return user;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }
  async signupWithInvite(email: string, password: string): Promise<AuthSession> {
    // MISSED-006 FIX: Normalize email at API boundary
    const normalizedEmail = normalizeEmail(email);
    return this.withAuthOperation(async () => {
      // If already authenticated, sign out first to ensure clean state
      if (this.session.state === 'authenticated') {
        globalLogger.info('[AppAuthService] User already authenticated, signing out before signup');
        try {
          await firebaseSignOut(this.auth);
          this.setSession({
            state: 'unauthenticated',
            user: null,
            emailVerified: null,
            lastTransitionError: null,
            lastAuthError: null,
            sessionExpiresAt: null,
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (err) {
          globalLogger.warn('[AppAuthService] Pre-signup logout failed', { error: err });
        }
      }

      // Set authenticating state at the start of the flow
      if (this.session.state !== 'authenticating') {
        this.setSession({
          state: 'authenticating',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
      }

      let invitedUser: AppUser | null = null;
      try {
        invitedUser = await this.appUserService.getUserByEmail(normalizedEmail);
      } catch (err) {
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw new InviteInvalidError();
      }
      if (!invitedUser) {
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw new InviteInvalidError();
      }
      if (invitedUser.inviteStatus === 'revoked') {
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw new InviteRevokedError();
      }
      if (invitedUser.inviteStatus === 'activated') {
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw new InviteAlreadyAcceptedError();
      }
      if (invitedUser.inviteStatus !== 'invited') {
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw new InviteInvalidError();
      }
      if (invitedUser.isDisabled) {
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw new NotAuthorizedError();
      }

      let cred;
      try {
        cred = await createUserWithEmailAndPassword(this.auth, normalizedEmail, password);
      } catch (err) {
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw mapFirebaseAuthError(err);
      }

      let freshUser: AppUser | null = null;
      try {
        freshUser = await this.appUserService.getUserByEmail(normalizedEmail);
      } catch (err) {
        await cred.user.delete();
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw new InviteInvalidError();
      }
      if (!freshUser) {
        await cred.user.delete();
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw new InviteInvalidError();
      }
      if (freshUser.id === cred.user.uid) {
        await cred.user.delete();
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        throw new InviteAlreadyAcceptedError();
      }
      // NEW-056 FIX: Check invite status immediately after fetch to catch concurrent revocation
      if (freshUser.inviteStatus !== 'invited') {
        await cred.user.delete();
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        if (freshUser.inviteStatus === 'revoked') {
          throw new InviteRevokedError();
        }
        throw new InviteInvalidError();
      }
      assertAuthIdentityNotLinked(freshUser, cred.user.uid);

      // MISSED-001 FIX: Re-check invite status immediately before linking to catch concurrent revocation
      const finalCheckBeforeLink = await this.appUserService.getUserByEmail(normalizedEmail);
      if (!finalCheckBeforeLink || finalCheckBeforeLink.inviteStatus !== 'invited') {
        await cred.user.delete();
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        globalLogger.warn('[AppAuthService] Invite was revoked between auth creation and linking', {
          email: normalizedEmail,
          status: finalCheckBeforeLink?.inviteStatus,
        });
        throw new InviteRevokedError();
      }

      try {
        await this.appUserService.linkAuthIdentity(freshUser.id, cred.user.uid);
        const linkedUser = await this.appUserService.getUserById(cred.user.uid);
        assertUserIdMatchesAuthUid(linkedUser!, cred.user.uid);
        // NEW-031 FIX: After linking, check if invite was revoked during the linking window
        if (linkedUser!.inviteStatus !== 'invited') {
          globalLogger.error(
            '[AppAuthService] signupWithInvite: invite status changed after linking (concurrent revocation detected)',
            { email, userId: linkedUser!.id, inviteStatus: linkedUser!.inviteStatus },
          );
          await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: true });
          this.setSession({
            state: 'unauthenticated',
            user: null,
            emailVerified: null,
            lastTransitionError: null,
            lastAuthError: null,
            sessionExpiresAt: null,
          });
          // NEW-031 FIX: Use more specific error if revoked
          if (linkedUser!.inviteStatus === 'revoked') {
            throw new InviteRevokedError();
          }
          throw new InviteInvalidError();
        }
        // NEW-043 FIX: This check is for safety but is always true (user should be disabled)
        if (linkedUser!.isDisabled !== true) {
          // User should have been disabled by linkAuthIdentity
          globalLogger.error(
            '[AppAuthService] SECURITY: User not disabled after linking (unexpected state)',
            { userId: linkedUser!.id, isDisabled: linkedUser!.isDisabled },
          );
          // Force disable
          await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: true });
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
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        // NEW-034 FIX: Re-throw without attempting activation
        rethrowOrMapAuthError(err);
      }

      // NEW-034 FIX: Only attempt activation after successful linking
      try {
        // BUG #5 FIX: Check pre-condition before activation
        const preActivationUser = await this.appUserService.getUserById(cred.user.uid);
        if (preActivationUser?.isDisabled === false) {
          globalLogger.warn(
            '[AppAuthService] User already enabled before activation (possible owner race)',
            {
              userId: cred.user.uid,
            },
          );
        }
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

        // Sync ID token to session cookie
        await this.syncTokenToCookie(cred.user);

        this.setSession({
          state: 'authenticated',
          user: appUser,
          emailVerified: cred.user.emailVerified,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt,
        });

        // Create session in Firestore and start heartbeat
        try {
          this.currentSessionId = await this.createSession(appUser.id);
          this.startSessionHeartbeat();
          this.sessionExpiryWarningShown = false; // Reset warning flag
        } catch (sessionErr) {
          globalLogger.warn('[AppAuthService] Failed to create session during signup with invite', {
            error: sessionErr instanceof Error ? sessionErr.message : String(sessionErr),
          });
        }

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
        this.setSession({
          state: 'unauthenticated',
          user: null,
          emailVerified: null,
          lastTransitionError: null,
          lastAuthError: null,
          sessionExpiresAt: null,
        });
        // Do NOT delete Firebase user after successful linking - Firestore owns authority
        // User is already disabled above; cleanup APIs will handle recovery
        throw mapFirebaseAuthError(err);
      }
    });
  }

  /**
   * Update user profile photo via Firebase Storage upload.
   * Supports owner updating anyone, others only self.
   * If photo is undefined, deletes the photo.
   * Automatically syncs session if updating self.
   * @param userId ID of user to update
   * @param photo File, base64 data URI, or undefined (to delete)
   * @throws InvalidInputError if photo validation fails
   * @throws AuthInfrastructureError if upload/delete fails
   * @throws NotSelfError if non-owner trying to update another user
   */
  async updateUserPhoto(userId: string, photo: File | string | undefined): Promise<AppUser> {
    return await this.withAuthOperation(async () => {
      assertAuthenticatedUser(this.session.user);

      // BUG #28 FIX: Verify target user exists and is active before allowing update
      const targetUser = await this.appUserService.getUserById(userId);
      if (!targetUser) {
        throw new InternalAuthError({ message: 'User not found' });
      }
      if (targetUser.isDisabled) {
        throw new NotAuthorizedError();
      }

      // RBAC: Owner can update anyone, others only self
      if (this.session.user.role === 'owner') {
        // Owner can update anyone - no restriction
      } else if (this.session.user.role === 'client') {
        this.requireSelf(userId);
      } else if (this.session.user.role === 'manager' || this.session.user.role === 'employee') {
        this.requireEmployeeSelfOnly(userId);
      } else {
        throw new InternalAuthError({ role: this.session.user.role });
      }

      // NEW-037 FIX: Track storage operation success for proper rollback
      // NEW-058 FIX: Track both upload and delete operations for comprehensive rollback
      let storageOperationSucceeded = false;
      const previousPhotoUrl = targetUser.photoUrl;
      try {
        let photoUrl: string | null;

        if (photo === undefined) {
          // Delete photo: remove from storage, clear Firestore field
          await this.deleteUserProfilePhoto(userId);
          storageOperationSucceeded = true;
          photoUrl = null; // Use null to delete field in Firestore
        } else {
          // Upload photo: normalize, upload to storage, get URL
          photoUrl = await this.uploadUserProfilePhoto(userId, photo);
          storageOperationSucceeded = true;
        }

        // Update Firestore with new photoUrl (or null to delete)
        const result = await this.appUserService.updateUserProfile(userId, { photoUrl });

        // If updating self, sync to session
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
        // NEW-037 FIX: Rollback upload if it succeeded
        // NEW-058 FIX: Log delete failures but don't fail entire operation (storage cleanup is already done)
        if (photo !== undefined && storageOperationSucceeded) {
          try {
            await this.deleteUserProfilePhoto(userId);
            globalLogger.info(
              '[AppAuthService] Rolled back uploaded photo file after Firestore update failed',
              {
                userId,
              },
            );
          } catch (rollbackErr) {
            globalLogger.error(
              '[AppAuthService] Failed to rollback storage on Firestore update failure',
              { userId, rollbackError: rollbackErr, originalError: err },
            );
          }
        } else if (photo === undefined && storageOperationSucceeded) {
          // Delete succeeded but Firestore failed - database is now stale
          // Log this clearly as it may require manual intervention
          globalLogger.warn(
            '[AppAuthService] Storage photo deleted but Firestore update failed - database is stale',
            { userId, previousPhotoUrl, error: err instanceof Error ? err.message : String(err) },
          );
        }
        rethrowOrMapAuthError(err);
      }
    });
  }

  async updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);

    // BUG #6 FIX: Capture role snapshot at method entry for re-check at completion
    const roleSnapshot = this.session.user.role;

    // Reject direct photoUrl updates - must use updateUserPhoto()
    if ('photoUrl' in data && data.photoUrl !== undefined && typeof data.photoUrl === 'string') {
      // Allow undefined (deletion via updateUserProfile), but reject URL strings
      // URLs should only come from uploadUserProfilePhoto(), not direct assignment
      throw new InvalidInputError('Use updateUserPhoto() to change profile photos');
    }

    if (roleSnapshot === 'owner') {
      // Owner can update anyone
    } else if (roleSnapshot === 'manager' || roleSnapshot === 'employee') {
      this.requireEmployeeSelfOnly(userId);
    } else if (roleSnapshot === 'client') {
      this.requireSelf(userId);
      // BUG #29 FIX: Throw error if client tries to update non-allowed fields
      const allowedFields = ['name', 'photoUrl'];
      const requestedFields = Object.keys(data);
      const invalidFields = requestedFields.filter((f) => !allowedFields.includes(f));
      if (invalidFields.length > 0) {
        throw new InvalidInputError(
          `Clients cannot update fields: ${invalidFields.join(', ')}. Only 'name' and 'photoUrl' are allowed.`,
        );
      }
      const allowed: Partial<UpdateAppUserProfile> = {};
      if ('name' in data) allowed.name = data.name;
      if ('photoUrl' in data) allowed.photoUrl = data.photoUrl;
      const result = await this.appUserService.updateUserProfile(userId, allowed);

      // NEW-062 FIX: Sync session after client self-update to prevent stale UI state
      // Without this, client sees old name/photo until page refresh or auth change
      this.setSession({
        state: 'authenticated',
        user: result,
        emailVerified: this.session.emailVerified,
        lastTransitionError: null,
        lastAuthError: null,
        sessionExpiresAt: this.session.sessionExpiresAt,
      });
      return result;
    } else {
      throw new InternalAuthError({ role: this.session.user.role });
    }
    try {
      const result = await this.appUserService.updateUserProfile(userId, data);

      // BUG #6 FIX: Re-check role at operation completion to detect concurrent role changes
      const currentRole = this.session.user.role;
      if (currentRole !== roleSnapshot) {
        globalLogger.warn(
          '[AppAuthService] User role changed during updateUserProfile (concurrent role update)',
          {
            userId,
            roleAtStart: roleSnapshot,
            roleAtEnd: currentRole,
          },
        );
        // Re-verify RBAC with new role
        if (currentRole !== 'owner' && (currentRole === 'manager' || currentRole === 'employee')) {
          this.requireEmployeeSelfOnly(userId);
        } else if (currentRole === 'client' && userId !== this.session.user.id) {
          throw new NotSelfError();
        }
      }

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

    // MISSED-005 FIX: Load current user once and verify it exists
    const currentUser = await this.appUserService.getUserById(userId);
    if (!currentUser) {
      throw new InternalAuthError({ message: 'User not found' });
    }
    // MISSED-005 FIX: Verify user is not deleted
    if (currentUser.deletedAt) {
      throw new InternalAuthError({ message: 'Cannot update deleted user' });
    }
    const roleUpdatedAtSnapshot = currentUser.roleUpdatedAt;

    try {
      const result = await this.appUserService.updateUserRole(userId, data);
      // NEW-038 FIX: Re-validate RBAC after update to ensure authorization still valid
      if (this.session.user!.role !== 'owner') {
        globalLogger.warn(
          '[AppAuthService] User role changed; RBAC may no longer permit role changes',
          {
            userId: this.session.user!.id,
            currentRole: this.session.user!.role,
          },
        );
        this.requireOwner(); // Re-check; will throw if no longer owner
      }
      // BUG #15 FIX: Warn if role was changed concurrently (another user modified role)
      if (
        result.roleUpdatedAt &&
        roleUpdatedAtSnapshot &&
        result.roleUpdatedAt > roleUpdatedAtSnapshot
      ) {
        const timeDiff = result.roleUpdatedAt.getTime() - roleUpdatedAtSnapshot.getTime();
        if (timeDiff > 0) {
          globalLogger.warn(
            '[AppAuthService] Concurrent role update detected (another user modified role)',
            { userId, timeDiffMs: timeDiff },
          );
        }
      }
      return result;
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
      // First update Firestore status
      const result = await this.appUserService.updateUserStatus(userId, data);

      globalLogger.info('[AppAuthService] Firestore user status updated', {
        userId,
        isDisabled: data.isDisabled,
      });

      // Then enforce it in Firebase Auth for instant effect
      if (data.isDisabled) {
        // Disable user: revoke all Firestore sessions (forces instant multi-device logout)
        globalLogger.info('[AppAuthService] Attempting to revoke user sessions', {
          userId,
          endpoint: '/api/auth/revoke-user-sessions',
        });

        try {
          const revokeResponse = await fetch('/api/auth/revoke-user-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: userId }),
          });

          if (!revokeResponse.ok) {
            const errorData = await revokeResponse.json().catch(() => ({ error: 'Unknown error' }));
            globalLogger.error(
              '[AppAuthService] Failed to revoke user sessions (Firestore updated)',
              {
                userId,
                status: revokeResponse.status,
                statusText: revokeResponse.statusText,
                error: errorData.error,
              },
            );
            // Don't throw - Firestore is already updated
          } else {
            const responseData = await revokeResponse.json();
            globalLogger.info(
              '[AppAuthService] User sessions revoked in Firestore for instant logout',
              {
                userId,
                revokedCount: responseData.revokedCount,
              },
            );
          }
        } catch (apiErr) {
          globalLogger.error(
            '[AppAuthService] Exception during session revocation (Firestore updated)',
            {
              userId,
              error: apiErr instanceof Error ? apiErr.message : String(apiErr),
              stack: apiErr instanceof Error ? apiErr.stack : undefined,
            },
          );
          // Don't throw - Firestore is already updated
        }
      } else {
        // Enable user: re-enable in Firebase Auth
        globalLogger.info('[AppAuthService] Attempting to enable user in Firebase Auth', {
          userId,
          endpoint: '/api/auth/enable-user',
        });

        try {
          const enableResponse = await fetch('/api/auth/enable-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: userId }),
          });

          if (!enableResponse.ok) {
            const errorData = await enableResponse.json().catch(() => ({ error: 'Unknown error' }));
            globalLogger.error(
              '[AppAuthService] Failed to enable user in Firebase Auth (Firestore updated)',
              {
                userId,
                status: enableResponse.status,
                statusText: enableResponse.statusText,
                error: errorData.error,
              },
            );
            // Don't throw - Firestore is already updated
          } else {
            const responseData = await enableResponse.json();
            globalLogger.info('[AppAuthService] User enabled in Firebase Auth', {
              userId,
              enabledAt: responseData.enabledAt,
            });
          }
        } catch (apiErr) {
          globalLogger.error(
            '[AppAuthService] Exception during user enablement (Firestore updated)',
            {
              userId,
              error: apiErr instanceof Error ? apiErr.message : String(apiErr),
              stack: apiErr instanceof Error ? apiErr.stack : undefined,
            },
          );
          // Don't throw - Firestore is already updated
        }
      }

      return result;
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
      // First delete from Firestore (soft or hard delete)
      await this.appUserService.deleteUser({ userId });

      // Then delete Firebase Auth user and storage via API
      try {
        await this.deleteAllUserStorage(userId);

        // Delete Firebase Auth user via admin API
        const deleteResponse = await fetch('/api/auth/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userId }),
        });

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          globalLogger.warn(
            '[AppAuthService] Failed to delete Firebase Auth user (continuing anyway)',
            {
              userId,
              status: deleteResponse.status,
              error: errorData.error,
            },
          );
        } else {
          globalLogger.info('[AppAuthService] Successfully deleted Firebase Auth user', {
            userId,
          });
        }
      } catch (err) {
        // Don't fail the entire operation if Firebase Auth deletion fails
        // The user is already deleted from Firestore
        globalLogger.warn('[AppAuthService] Error calling delete Firebase Auth API', {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
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
    // BUG #17 FIX: Always normalize email for consistent lookups
    const normalizedEmail = normalizeEmail(email);
    this.assertAdminContext();
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

  /**
   * Cleanup orphaned linked users (Firebase Auth created but activation incomplete).
   * NEW-064: Detects multiple orphan states:
   * - Primary: inviteStatus='activated' + isRegisteredOnERP=false (auth created, flags not set)
   * - Edge: inviteStatus='invited' + authLinkedUid exists (partial link before status flip)
   *
   * This API is intentionally conservative - only cleans obvious orphan states.
   * Manual investigation required for ambiguous cases.
   * @throws InviteInvalidError if user doesn't match orphan criteria
   */
  async cleanupOrphanedLinkedUser(userId: string): Promise<void> {
    this.requireOwner();
    const now = Date.now();
    if (now - this.lastCleanupTimestamp < AppAuthService.CLEANUP_COOLDOWN_MS) {
      throw new TooManyRequestsError();
    }

    // NEW-060 FIX: Validate user state BEFORE updating cooldown timestamp
    // This prevents invalid attempts from consuming the cooldown window
    const user = await this.appUserService.getUserById(userId);
    if (!user) throw new InviteInvalidError();

    // NEW-064 FIX: Broaden detection to catch partial activation failures
    const isPrimaryOrphan = user.inviteStatus === 'activated' && user.isRegisteredOnERP === false;
    const isPartialLinkOrphan = user.inviteStatus === 'invited' && !!user.authLinkedUid;

    if (!isPrimaryOrphan && !isPartialLinkOrphan) {
      globalLogger.warn('[AppAuthService] User does not match orphan criteria', {
        userId,
        inviteStatus: user.inviteStatus,
        isRegisteredOnERP: user.isRegisteredOnERP,
        hasAuthLinkedUid: !!user.authLinkedUid,
      });
      throw new InviteInvalidError();
    }

    // Only update cooldown after all validation passes
    this.lastCleanupTimestamp = now;

    globalLogger.warn(
      '[AppAuthService] Soft-deleting orphaned user (hard delete requires separate explicit call)',
      {
        userId,
        ownerUserId: this.session.user?.id,
        orphanType: isPrimaryOrphan ? 'primary' : 'partial-link',
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
    // NEW-051 FIX: Check session state (authoritative) before Firebase user
    assertAuthenticatedUser(this.session.user);

    const user = this.auth.currentUser;
    if (!user?.email) {
      throw new InternalAuthError({ message: 'Firebase user missing or has no email' });
    }
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
    // BUG #4 FIX: Explicitly check state after expiry detection
    if (session.state !== 'authenticated' || !session.user) {
      throw new NotAuthenticatedError();
    }
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
      // NEW-047 FIX: Ensure consistent email normalization (userId is already from DB, normalized)
      if (!options?.force && user.inviteSentAt) {
        const nowMs = new Date().getTime();
        const sentMs = new Date(user.inviteSentAt).getTime();
        const elapsedMs = nowMs - sentMs;
        const RESEND_COOLDOWN_MS = 24 * 60 * 60 * 1000;

        if (elapsedMs < RESEND_COOLDOWN_MS) {
          const minutesRemaining = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / (60 * 1000));
          const hoursRemaining = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / (60 * 60 * 1000));
          globalLogger.warn('[AppAuthService] Invite resend rate limited', {
            userId,
            lastSentAt: user.inviteSentAt,
            minutesRemaining,
          });
          const error = new TooManyRequestsError();
          (error as any).minutesRemaining = minutesRemaining;
          (error as any).hoursRemaining = hoursRemaining;
          throw error;
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
    // NEW-048 FIX: Validate pageSize minimum and type before using
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new InvalidInputError(`pageSize must be integer between 1 and ${MAX_PAGE_SIZE}`);
    }
    try {
      return await this.appUserService.listUsersPaginated(pageSize, pageToken);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }
}

export const appAuthService = new AppAuthService();
