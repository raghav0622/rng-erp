// Shared adapter error-mapping utility for kernel
// Ensures all infra errors are mapped to canonical domain errors
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

/**
 * Firebase adapter error codes as enums for type safety.
 */
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

/**
 * Adapter error mapping: always returns a canonical domain error.
 * Never returns raw infra errors. Unknown/infra errors are wrapped in KernelInvariantViolationError.
 */
export function mapAdapterError(error: unknown): Error {
  // Accept both enum and string for backward compatibility
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
  if (error instanceof Error) {
    // If already a canonical domain error, return as-is
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
    // Unknown infra error: fail closed
    return new KernelInvariantViolationError('Unknown adapter error (Error instance)');
  }
  // Fallback: truly unknown error type
  return new KernelInvariantViolationError(`Unknown adapter error code: ${String(error)}`);
}
}

/**
 * Adapter contract: always return DomainResult<T>, never throw raw errors.
 * All errors are mapped via mapAdapterError.
 */
export function toDomainResult<T>(fn: () => Promise<T>): Promise<DomainResult<T>> {
  return fn()
    .then((value): { ok: true; value: T } => ({ ok: true, value }))
    .catch((error): { ok: false; error: Error } => ({ ok: false, error: mapAdapterError(error) }));
}
