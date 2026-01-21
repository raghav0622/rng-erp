// kernel-error-mapping.ts
// Maps thrown errors to canonical kernel error types for deterministic bubbling.
import { AuthErrorBase } from '../../kernel/errors/AuthErrorBase';
import { FeatureErrorBase } from '../../kernel/errors/FeatureErrorBase';
import { InfraErrorBase } from '../../kernel/errors/InfraErrorBase';
import { RBACErrorBase } from '../../kernel/errors/RBACErrorBase';

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

// Map any error to a KernelError (type-based only)
export function mapToKernelError(err: unknown): KernelError {
  if (err instanceof FeatureErrorBase) {
    return new KernelError('FEATURE_ERROR', (err as Error).message, err as Error);
  }
  if (err instanceof AuthErrorBase) {
    return new KernelError('AUTH_ERROR', (err as Error).message, err as Error);
  }
  if (err instanceof RBACErrorBase) {
    return new KernelError('RBAC_ERROR', (err as Error).message, err as Error);
  }
  if (err instanceof InfraErrorBase) {
    return new KernelError('INFRA_ERROR', (err as Error).message, err as Error);
  }
  // Fallback: treat as infra error
  return new KernelError('INFRA_ERROR', (err as any)?.message || 'Unknown error', err as Error);
}
