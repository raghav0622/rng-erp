// Auth Domain Contract
// No implementation. No runtime logic.

/**
 * AuthState contract as a discriminated union:
 * - If status is 'authenticated', 'locked', or 'pending', userId is required.
 * - For 'unauthenticated', 'expired', 'deleted', userId is forbidden.
 */
export type AuthState =
  | { status: 'unauthenticated'; reason?: string; createdAt?: string; updatedAt?: string }
  | { status: 'expired'; reason?: string; createdAt?: string; updatedAt?: string }
  | { status: 'deleted'; reason?: string; createdAt?: string; updatedAt?: string }
  | { status: 'authenticated'; userId: string; createdAt?: string; updatedAt?: string }
  | { status: 'locked'; userId: string; reason?: string; createdAt?: string; updatedAt?: string }
  | {
      status: 'pending';
      userId: string;
      challengeType?: string;
      createdAt?: string;
      updatedAt?: string;
    };

/**
 * Allowed transitions:
 * - unauthenticated → authenticated (on valid credentials)
 * - authenticated → locked (on violation)
 * - any → pending (on challenge)
 * - pending → authenticated (on success)
 * - any → unauthenticated (on logout or failure)
 */

/**
 * Hard invariants:
 * - Only one user may be authenticated at a time.
 * - No implicit elevation or fallback.
 * - All transitions are explicit and explainable.
 * - No client-side credential storage.
 */

/**
 * Forbidden states:
 * - Multiple users authenticated
 * - Unexplained transitions
 * - Silent failures
 */

/**
 * Error expectations:
 * - All errors are typed and explainable.
 * - No free-text errors.
 */
