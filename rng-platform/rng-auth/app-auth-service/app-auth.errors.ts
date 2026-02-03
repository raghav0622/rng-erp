import { AuthError } from 'firebase/auth';

export type AppAuthErrorCode =
  | 'auth/invalid-credentials'
  | 'auth/email-already-in-use'
  | 'auth/weak-password'
  | 'auth/invalid-email'
  | 'auth/invalid-input'
  | 'auth/too-many-requests'
  | 'auth/user-disabled'
  | 'auth/session-expired'
  | 'auth/not-authenticated'
  | 'auth/not-authorized'
  | 'auth/invite-invalid'
  | 'auth/invite-already-accepted'
  | 'auth/invite-revoked'
  | 'auth/owner-already-exists'
  | 'auth/owner-bootstrap-race'
  | 'auth/invariant-violation'
  | 'auth/infrastructure-error'
  | 'auth/internal';

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

export class InvalidInputError extends AppAuthError {
  readonly code = 'auth/invalid-input';
  constructor(message: string, cause?: unknown) {
    super(message, cause);
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

export class OwnerBootstrapRaceDetectedError extends AppAuthError {
  readonly code = 'auth/owner-bootstrap-race';
  constructor() {
    super(
      'Owner bootstrap race detected: another concurrent signup succeeded first. The orphaned Firebase Auth user has been cleaned up.',
    );
  }
}

export class AuthInvariantViolationError extends AppAuthError {
  readonly code = 'auth/invariant-violation';
  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}

export class AuthInfrastructureError extends AppAuthError {
  readonly code = 'auth/infrastructure-error';
  constructor(message: string, cause?: unknown) {
    super(message, cause);
  }
}

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
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
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

export function isAppAuthError(error: unknown): error is AppAuthError {
  return error instanceof AppAuthError;
}
