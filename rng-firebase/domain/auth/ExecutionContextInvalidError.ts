import { AuthErrorBase } from '../../kernel/errors/AuthErrorBase';

export class ExecutionContextInvalidError extends AuthErrorBase {
  constructor(message: string) {
    super(message, 'EXECUTION_CONTEXT_INVALID');
    Object.setPrototypeOf(this, ExecutionContextInvalidError.prototype);
  }
}
