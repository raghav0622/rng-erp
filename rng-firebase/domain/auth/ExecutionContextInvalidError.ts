// ExecutionContextInvalidError.ts
export class ExecutionContextInvalidError extends Error {
  readonly code = 'EXECUTION_CONTEXT_INVALID';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, ExecutionContextInvalidError.prototype);
  }
}
