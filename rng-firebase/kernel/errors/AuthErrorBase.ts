import { KernelErrorBase } from './KernelErrorBase';

export class AuthErrorBase extends KernelErrorBase {
  constructor(message: string, code = 'AUTH_ERROR') {
    super(message, code);
    Object.setPrototypeOf(this, AuthErrorBase.prototype);
  }
}
