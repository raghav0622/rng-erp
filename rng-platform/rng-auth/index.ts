import type { IAppAuthService } from './app-auth-service/app-auth.contracts';
import { appAuthService as appAuthServiceImpl } from './app-auth-service/app-auth.service';

// Auth session types
export type {
  AuthSession,
  AuthSessionState,
  UnsubscribeFn,
} from './app-auth-service/app-auth.contracts';

// App user types
export type {
  AppUser,
  CreateInvitedUser,
  ListUsersPaginatedResult,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './app-auth-service/internal-app-user-service/app-user.contracts';

// Error types
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
  OwnerBootstrapRaceDetectedError,
  SessionExpiredError,
  TooManyRequestsError,
  UserDisabledError,
  WeakPasswordError,
} from './app-auth-service/app-auth.errors';

// Error message mapping for UI
export {
  authErrorMessages,
  getAuthErrorMessage,
  normalizeErrorMessage,
} from './app-auth-service/app-auth.error-messages';

// Service singleton (for advanced use cases only - prefer hooks)
export type PublicAppAuthService = Omit<
  IAppAuthService,
  'listOrphanedLinkedUsers' | 'cleanupOrphanedLinkedUser'
>;
export const appAuthService: PublicAppAuthService = appAuthServiceImpl;

// React Query hooks (PRIMARY API FOR UI COMPONENTS)
export * from './app-auth-hooks/index';

// Note: AppUser, AppUserRole, AppUserInviteStatus, and related types are already
// exported above via app-auth-hooks and app-auth-service exports.
export { AppUserInvariantViolation } from './app-auth-service/internal-app-user-service/app-user.invariants';
