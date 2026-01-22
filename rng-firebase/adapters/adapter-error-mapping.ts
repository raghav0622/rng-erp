import {
  AuthDisabledError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InviteExpiredError,
  InviteRevokedError,
  OwnerAlreadyExistsError,
  OwnerBootstrapError,
  SessionInvalidatedError,
  SignupNotAllowedError,
  UserNotFoundError,
} from '../domain/auth/auth.errors';
import type { DomainResult } from '../domain/common/result';
import { KernelInvariantViolationError } from '../kernel-errors';

export enum FirebaseAdapterErrorCode {
  AuthDisabled = 'AUTH_DISABLED',
  EmailNotVerified = 'EMAIL_NOT_VERIFIED',
  InviteExpired = 'INVITE_EXPIRED',
  InviteRevoked = 'INVITE_REVOKED',
  OwnerAlreadyExists = 'OWNER_ALREADY_EXISTS',
  OwnerBootstrapError = 'OWNER_BOOTSTRAP_ERROR',
  SessionInvalidated = 'SESSION_INVALIDATED',
  SignupNotAllowed = 'SIGNUP_NOT_ALLOWED',
  UserNotFound = 'USER_NOT_FOUND',
  InvalidCredentials = 'INVALID_CREDENTIALS',
}

  // Map string error codes
  const errorCode = typeof error === 'string' ? error : (error as FirebaseAdapterErrorCode);
  const errorMap: Record<FirebaseAdapterErrorCode, () => Error> = {
    [FirebaseAdapterErrorCode.AuthDisabled]: () => new AuthDisabledError(),
    [FirebaseAdapterErrorCode.EmailNotVerified]: () => new EmailNotVerifiedError(),
    [FirebaseAdapterErrorCode.InviteExpired]: () => new InviteExpiredError(),
    [FirebaseAdapterErrorCode.InviteRevoked]: () => new InviteRevokedError(),
    [FirebaseAdapterErrorCode.OwnerAlreadyExists]: () => new OwnerAlreadyExistsError(),
    [FirebaseAdapterErrorCode.OwnerBootstrapError]: () => new OwnerBootstrapError(),
    [FirebaseAdapterErrorCode.SessionInvalidated]: () => new SessionInvalidatedError(),
    [FirebaseAdapterErrorCode.SignupNotAllowed]: () => new SignupNotAllowedError(),
    [FirebaseAdapterErrorCode.UserNotFound]: () => new UserNotFoundError(),
    [FirebaseAdapterErrorCode.InvalidCredentials]: () => new InvalidCredentialsError(),
  };
  if (Object.prototype.hasOwnProperty.call(errorMap, errorCode)) {
    return errorMap[errorCode as FirebaseAdapterErrorCode]!();
  }
  // Map FirebaseError objects with code property
  if (error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string') {
    const firebaseCode = (error as any).code;
    // Map known Firebase Auth error codes to canonical domain errors
    switch (firebaseCode) {
      case 'auth/user-disabled':
        return new AuthDisabledError((error as any).message);
      case 'auth/email-not-verified':
        return new EmailNotVerifiedError((error as any).message);
      case 'auth/user-not-found':
        return new UserNotFoundError((error as any).message);
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return new InvalidCredentialsError((error as any).message);
      case 'auth/operation-not-allowed':
        return new SignupNotAllowedError((error as any).message);
      // Add more mappings as needed
      default:
        return new KernelInvariantViolationError(`Unknown Firebase adapter error code: ${firebaseCode}`);
    }
  }
  if (error instanceof Error) {
    if (
      error instanceof AuthDisabledError ||
      error instanceof EmailNotVerifiedError ||
      error instanceof InvalidCredentialsError ||
      error instanceof InviteExpiredError ||
      error instanceof InviteRevokedError ||
      error instanceof OwnerAlreadyExistsError ||
      error instanceof OwnerBootstrapError ||
      error instanceof SessionInvalidatedError ||
      error instanceof SignupNotAllowedError ||
      error instanceof UserNotFoundError
    ) {
      return error;
    }
    return new KernelInvariantViolationError('Unknown adapter error (Error instance)');
  }
  return new KernelInvariantViolationError(`Unknown adapter error code: ${String(error)}`);
}

export function toDomainResult<T>(fn: () => Promise<T>): Promise<DomainResult<T>> {
  return fn()
    .then((value): { ok: true; value: T } => ({ ok: true, value }))
    .catch((error): { ok: false; error: Error } => ({ ok: false, error: mapAdapterError(error) }));
}
