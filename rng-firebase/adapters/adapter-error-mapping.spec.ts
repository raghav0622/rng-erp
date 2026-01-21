import { describe, expect, it } from 'vitest';
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
import { KernelInvariantViolationError } from '../kernel-errors';
import { mapAdapterError, toDomainResult } from './adapter-error-mapping';

describe('adapter-error-mapping', () => {
  describe('mapAdapterError', () => {
    it('maps known string errors to canonical domain errors', () => {
      expect(mapAdapterError('AUTH_DISABLED')).toBeInstanceOf(AuthDisabledError);
      expect(mapAdapterError('EMAIL_NOT_VERIFIED')).toBeInstanceOf(EmailNotVerifiedError);
      expect(mapAdapterError('INVITE_EXPIRED')).toBeInstanceOf(InviteExpiredError);
      expect(mapAdapterError('INVITE_REVOKED')).toBeInstanceOf(InviteRevokedError);
      expect(mapAdapterError('OWNER_ALREADY_EXISTS')).toBeInstanceOf(OwnerAlreadyExistsError);
      expect(mapAdapterError('OWNER_BOOTSTRAP_ERROR')).toBeInstanceOf(OwnerBootstrapError);
      expect(mapAdapterError('SESSION_INVALIDATED')).toBeInstanceOf(SessionInvalidatedError);
      expect(mapAdapterError('SIGNUP_NOT_ALLOWED')).toBeInstanceOf(SignupNotAllowedError);
      expect(mapAdapterError('USER_NOT_FOUND')).toBeInstanceOf(UserNotFoundError);
      expect(mapAdapterError('INVALID_CREDENTIALS')).toBeInstanceOf(InvalidCredentialsError);
    });

    it('wraps unknown string errors in KernelInvariantViolationError', () => {
      const err = mapAdapterError('totally unknown error');
      expect(err).toBeInstanceOf(KernelInvariantViolationError);
      expect(err.message).toContain('totally unknown error');
    });

    it('returns canonical domain errors as-is', () => {
      const e = new AuthDisabledError();
      expect(mapAdapterError(e)).toBe(e);
    });

    it('wraps unknown infra errors in KernelInvariantViolationError', () => {
      const e = new Error('infra fail');
      const mapped = mapAdapterError(e);
      expect(mapped).toBeInstanceOf(KernelInvariantViolationError);
      expect(mapped.message).toContain('Unknown adapter error (Error instance)');
    });

    it('wraps non-string, non-Error values in KernelInvariantViolationError', () => {
      expect(mapAdapterError(42)).toBeInstanceOf(KernelInvariantViolationError);
      expect(mapAdapterError(null)).toBeInstanceOf(KernelInvariantViolationError);
      expect(mapAdapterError(undefined)).toBeInstanceOf(KernelInvariantViolationError);
      expect(mapAdapterError({})).toBeInstanceOf(KernelInvariantViolationError);
    });
  });

  describe('toDomainResult', () => {
    it('returns ok:true for successful fn', async () => {
      const result = await toDomainResult(() => Promise.resolve(123));
      expect(result.ok).toBe(true);
      expect(result.value).toBe(123);
    });

    it('returns ok:false and maps error for known string error', async () => {
      const result = await toDomainResult(() => Promise.reject('AUTH_DISABLED'));
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(AuthDisabledError);
    });

    it('returns ok:false and maps error for unknown string error', async () => {
      const result = await toDomainResult(() => Promise.reject('something odd'));
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(KernelInvariantViolationError);
    });

    it('returns ok:false and maps error for infra Error', async () => {
      const result = await toDomainResult(() => Promise.reject(new Error('infra fail')));
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(KernelInvariantViolationError);
    });

    it('returns ok:false and maps error for non-string, non-Error', async () => {
      const result = await toDomainResult(() => Promise.reject(42));
      expect(result.ok).toBe(false);
      expect(result.error).toBeInstanceOf(KernelInvariantViolationError);
    });
  });
});
