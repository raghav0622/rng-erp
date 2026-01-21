import { AuthErrorBase } from '../../kernel/errors/AuthErrorBase';

export class InviteRevokedError extends AuthErrorBase {
  constructor(message = 'Invite has been revoked') {
    super(message, 'INVITE_REVOKED');
    Object.setPrototypeOf(this, InviteRevokedError.prototype);
  }
}

export class InviteExpiredError extends AuthErrorBase {
  constructor(message = 'Invite has expired') {
    super(message, 'INVITE_EXPIRED');
    Object.setPrototypeOf(this, InviteExpiredError.prototype);
  }
}

export class UserNotFoundError extends AuthErrorBase {
  constructor(message = 'User not found') {
    super(message, 'USER_NOT_FOUND');
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

export class SessionInvalidatedError extends AuthErrorBase {
  constructor(message = 'Session has been invalidated') {
    super(message, 'SESSION_INVALIDATED');
    Object.setPrototypeOf(this, SessionInvalidatedError.prototype);
  }
}
// Typed errors for Auth domain (Phase 1)

export class AuthDisabledError extends AuthErrorBase {
  constructor(message = 'User is disabled') {
    super(message, 'AUTH_DISABLED');
    Object.setPrototypeOf(this, AuthDisabledError.prototype);
  }
}

export class EmailNotVerifiedError extends AuthErrorBase {
  constructor(message = 'Email not verified') {
    super(message, 'EMAIL_NOT_VERIFIED');
    Object.setPrototypeOf(this, EmailNotVerifiedError.prototype);
  }
}

export class SignupNotAllowedError extends AuthErrorBase {
  constructor(message = 'Signup is not allowed') {
    super(message, 'SIGNUP_NOT_ALLOWED');
    Object.setPrototypeOf(this, SignupNotAllowedError.prototype);
  }
}

export class OwnerAlreadyExistsError extends AuthErrorBase {
  constructor(message = 'Owner already exists') {
    super(message);
    Object.setPrototypeOf(this, OwnerAlreadyExistsError.prototype);
  }
}

export class InvalidCredentialsError extends AuthErrorBase {
  constructor(message = 'Invalid credentials') {
    super(message, 'INVALID_CREDENTIALS');
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

export class OwnerBootstrapError extends AuthErrorBase {
  constructor(message = 'Owner bootstrap violation') {
    super(message, 'OWNER_BOOTSTRAP_ERROR');
    Object.setPrototypeOf(this, OwnerBootstrapError.prototype);
  }
}
