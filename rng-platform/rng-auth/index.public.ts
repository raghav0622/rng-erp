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
