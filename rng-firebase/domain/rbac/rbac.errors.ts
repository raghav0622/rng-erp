import { RBACErrorBase } from '../../kernel/errors/RBACErrorBase';

export class RBACForbiddenError extends RBACErrorBase {
  constructor(message = 'RBAC: Access denied') {
    super(message, 'RBAC_FORBIDDEN');
    Object.setPrototypeOf(this, RBACForbiddenError.prototype);
  }
}

export class RBACMisconfigurationError extends RBACErrorBase {
  constructor(message = 'RBAC: Misconfiguration detected') {
    super(message, 'RBAC_MISCONFIGURATION');
    Object.setPrototypeOf(this, RBACMisconfigurationError.prototype);
  }
}
