/**
 * App Auth Module - Public API
 *
 * Exports the authentication service, contracts, and errors.
 * This module should be consumed via rng-platform/modules/index.public.ts
 */

export type {
  AuthSession,
  AuthSessionState,
  IAppAuthService,
  UnsubscribeFn,
} from './app-auth.contracts';
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
} from './app-auth.errors';
export { appAuthService } from './app-auth.service';
