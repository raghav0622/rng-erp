// Canonical kernel-level fatal error for invariant violations

export class KernelInvariantViolationError extends Error {
  readonly code = 'KERNEL_INVARIANT_VIOLATION';
  constructor(message: string) {
    super(message);
    this.name = 'KernelInvariantViolationError';
  }
}
