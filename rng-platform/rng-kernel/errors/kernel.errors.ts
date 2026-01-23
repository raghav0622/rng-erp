// Kernel Error Types
// No implementation. No runtime logic.

/**
 * All errors are typed and explainable.
 * No free-text errors.
 */

import type { FeatureExecutionError } from '../execution/execution.errors';

export type KernelError =
  | KernelInvariantViolationError
  | KernelMisconfigurationError
  | KernelBootstrapError
  | FeatureExecutionError;

export interface KernelInvariantViolationError {
  type: 'KERNEL_INVARIANT_VIOLATION';
  invariant: string;
  explanation: string;
}

export interface KernelMisconfigurationError {
  type: 'KERNEL_MISCONFIGURATION';
  configKey: string;
  explanation: string;
}

export interface KernelBootstrapError {
  type: 'KERNEL_BOOTSTRAP_ERROR';
  reason: string;
  explanation: string;
}
