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
 * Adapter error mapping: always returns a canonical domain error.
 * Never returns raw infra errors. Unknown/infra errors are wrapped in KernelInvariantViolationError.
 */
export function mapAdapterError(error: unknown): Error {
  if (typeof error === 'string') {
    if (error.includes('disabled')) return new AuthDisabledError();
    if (error.includes('not verified')) return new EmailNotVerifiedError();
    if (error.includes('invite expired')) return new InviteExpiredError();
    if (error.includes('invite revoked')) return new InviteRevokedError();
    if (error.includes('owner exists')) return new OwnerAlreadyExistsError();
    if (error.includes('bootstrap violation')) return new OwnerBootstrapError();
    if (error.includes('session invalid')) return new SessionInvalidatedError();
    if (error.includes('signup not allowed')) return new SignupNotAllowedError();
    if (error.includes('user not found')) return new UserNotFoundError();
    if (error.includes('invalid credentials')) return new InvalidCredentialsError();
    // Unknown string error: treat as infra error
    return new KernelInvariantViolationError(`Unknown adapter error string: ${error}`);
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
    // Unknown infra error: wrap in KernelInvariantViolationError
    return new KernelInvariantViolationError(`Unknown adapter error: ${error.message}`);
  }
  // Fallback: truly unknown error type
  return new KernelInvariantViolationError('Unknown adapter error (non-string, non-Error)');
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
