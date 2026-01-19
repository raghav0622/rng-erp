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
      expect(mapAdapterError('disabled')).toBeInstanceOf(AuthDisabledError);
      expect(mapAdapterError('not verified')).toBeInstanceOf(EmailNotVerifiedError);
      expect(mapAdapterError('invite expired')).toBeInstanceOf(InviteExpiredError);
      expect(mapAdapterError('invite revoked')).toBeInstanceOf(InviteRevokedError);
      expect(mapAdapterError('owner exists')).toBeInstanceOf(OwnerAlreadyExistsError);
      expect(mapAdapterError('bootstrap violation')).toBeInstanceOf(OwnerBootstrapError);
      expect(mapAdapterError('session invalid')).toBeInstanceOf(SessionInvalidatedError);
      expect(mapAdapterError('signup not allowed')).toBeInstanceOf(SignupNotAllowedError);
      expect(mapAdapterError('user not found')).toBeInstanceOf(UserNotFoundError);
      expect(mapAdapterError('invalid credentials')).toBeInstanceOf(InvalidCredentialsError);
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
      expect(mapped.message).toContain('infra fail');
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
      const result = await toDomainResult(() => Promise.reject('disabled'));
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
