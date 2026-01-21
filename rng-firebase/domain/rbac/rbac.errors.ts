import { RBACErrorBase } from '../../kernel/errors/RBACErrorBase';
import type { RBACDenialReason } from './rbac.reasons';

export class RBACForbiddenError extends RBACErrorBase {
  readonly reason: RBACDenialReason;
  constructor(reason: RBACDenialReason, message = 'RBAC: Access denied') {
    super(message, 'RBAC_FORBIDDEN');
    this.reason = reason;
    Object.setPrototypeOf(this, RBACForbiddenError.prototype);
  }
}

export class RBACMisconfigurationError extends RBACErrorBase {
  constructor(message = 'RBAC: Misconfiguration detected') {
    super(message, 'RBAC_MISCONFIGURATION');
    Object.setPrototypeOf(this, RBACMisconfigurationError.prototype);
  }
}
