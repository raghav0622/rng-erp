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
  // TODO: Add mapping for Auth, RBAC, Infra errors
  return new KernelError('INFRA_ERROR', (err as any)?.message || 'Unknown error', err as Error);
}
