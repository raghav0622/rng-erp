// Typed errors for RBAC domain (Phase 2)

export class RBACForbiddenError extends Error {
  readonly code = 'RBAC_FORBIDDEN';
  constructor(message = 'RBAC: Access denied') {
    super(message);
    Object.setPrototypeOf(this, RBACForbiddenError.prototype);
  }
}

export class RBACMisconfigurationError extends Error {
  readonly code = 'RBAC_MISCONFIGURATION';
  constructor(message = 'RBAC: Misconfiguration detected') {
    super(message);
    Object.setPrototypeOf(this, RBACMisconfigurationError.prototype);
  }
}
