import { AuthErrorBase } from '../../kernel/errors/AuthErrorBase';

export class ExecutionContextStaleError extends AuthErrorBase {
  constructor(message: string) {
    super(message, 'EXECUTION_CONTEXT_STALE');
    Object.setPrototypeOf(this, ExecutionContextStaleError.prototype);
  }
}
