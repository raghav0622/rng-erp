// AuthService orchestrator for kernel (Phase 1)
import type { AuthContextState, Invite } from './auth.types';

/**
 * AuthService orchestrates all user/session creation and state transitions.
 * All edge cases and violations MUST throw explicit typed errors.
 * No generic Error allowed. Only this service may create users or resolve sessions.
 */
export interface AuthService {
  /**
   * Sign in a user. Throws:
   * - UserNotFoundError
   * - AuthDisabledError
   * - EmailNotVerifiedError
   * - InvalidCredentialsError
   * - SessionInvalidatedError
   */
  signIn(email: string, password: string): Promise<AuthContextState>;

  /**
   * Sign out the current user. Throws SessionInvalidatedError on failure.
   */
  signOut(): Promise<void>;

  /**
   * Atomically create the owner user. Throws:
   * - OwnerAlreadyExistsError
   * - OwnerBootstrapError
   * - AuthDisabledError
   */
  createOwner(email: string, password: string): Promise<AuthContextState>;

  /**
   * Create a user with a valid invite. Throws:
   * - InviteExpiredError
   * - InviteRevokedError
   * - SignupNotAllowedError
   * - AuthDisabledError
   */
  createUserWithInvite(invite: Invite, password: string): Promise<AuthContextState>;

  /**
   * Send email verification. Throws EmailNotVerifiedError if not allowed.
   */
  sendEmailVerification(): Promise<void>;

  /**
   * Get current auth state. Throws SessionInvalidatedError if session is invalid.
   */
  getCurrentState(): Promise<AuthContextState>;
}
}

// Implementation is not provided in Phase 1. This contract ensures all orchestration and invariants are enforced centrally.
