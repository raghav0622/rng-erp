// ExecutionContextStaleError.ts
export class ExecutionContextStaleError extends Error {
  readonly code = 'EXECUTION_CONTEXT_STALE';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ExecutionContextStaleError.prototype);
  }
}
