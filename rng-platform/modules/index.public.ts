/**
 * Public API for rng-platform/modules
 *
 * This is the ONLY entry point for consuming the platform modules.
 * Internal module files MUST NOT be imported directly.
 */

// App Auth Module (primary authentication & user management service)
export type {
  AuthSession,
  AuthSessionState,
  IAppAuthService,
  UnsubscribeFn,
} from './app-auth/app-auth.contracts';
export {
  AppAuthError,
  EmailAlreadyInUseError,
  InternalAuthError,
  InvalidCredentialsError,
  InvalidEmailError,
  InviteAlreadyAcceptedError,
  InviteInvalidError,
  InviteRevokedError,
  NotAuthenticatedError,
  NotAuthorizedError,
  NotOwnerError,
  NotSelfError,
  SessionExpiredError,
  UserDisabledError,
  WeakPasswordError,
  isAppAuthError,
} from './app-auth/app-auth.errors';
export { appAuthService } from './app-auth/app-auth.service';

// App User Module (user projection contracts - internal use only via AppAuthService)
export type {
  AppUser,
  AppUserInviteStatus,
  AppUserRole,
  CreateInvitedUser,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './app-user/app-user.contracts';
export { AppUserInvariantViolation } from './app-user/app-user.invariants';
