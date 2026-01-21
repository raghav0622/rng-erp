import { KernelErrorBase } from './KernelErrorBase';

export class RBACErrorBase extends KernelErrorBase {
  constructor(message: string, code = 'RBAC_ERROR') {
    super(message, code);
    Object.setPrototypeOf(this, RBACErrorBase.prototype);
  }
}
