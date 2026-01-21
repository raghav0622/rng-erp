// kernel-error-mapping.ts
// Maps thrown errors to canonical kernel error types for deterministic bubbling.
import { FeatureExecutionError } from './FeatureExecutionError';

// Canonical kernel error types
export type KernelErrorType = 'AUTH_ERROR' | 'RBAC_ERROR' | 'FEATURE_ERROR' | 'INFRA_ERROR';

export class KernelError extends Error {
  constructor(
    public readonly type: KernelErrorType,
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
  }
}

// Map any error to a KernelError
export function mapToKernelError(err: unknown): KernelError {
  if (err instanceof FeatureExecutionError) {
    return new KernelError('FEATURE_ERROR', err.message, err);
  }
  // Auth errors
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as any).code;
    if (code && typeof code === 'string') {
      if (
        code.startsWith('AUTH_') ||
        code === 'EMAIL_NOT_VERIFIED' ||
        code === 'SIGNUP_NOT_ALLOWED' ||
        code === 'OWNER_ALREADY_EXISTS' ||
        code === 'OWNER_BOOTSTRAP_ERROR'
      ) {
        return new KernelError('AUTH_ERROR', (err as any).message || 'Auth error', err as Error);
      }
      if (code.startsWith('RBAC_')) {
        return new KernelError('RBAC_ERROR', (err as any).message || 'RBAC error', err as Error);
      }
      if (code === 'FEATURE_EXECUTION_ERROR') {
        return new KernelError(
          'FEATURE_ERROR',
          (err as any).message || 'Feature error',
          err as Error,
        );
      }
    }
  }
  // Fallback: treat as infra error
  return new KernelError('INFRA_ERROR', (err as any)?.message || 'Unknown error', err as Error);
}
