export class InviteRevokedError extends Error {
  readonly code = 'INVITE_REVOKED';
  constructor(message = 'Invite has been revoked') {
    super(message);
    Object.setPrototypeOf(this, InviteRevokedError.prototype);
  }
}

export class InviteExpiredError extends Error {
  readonly code = 'INVITE_EXPIRED';
  constructor(message = 'Invite has expired') {
    super(message);
    Object.setPrototypeOf(this, InviteExpiredError.prototype);
  }
}

export class UserNotFoundError extends Error {
  readonly code = 'USER_NOT_FOUND';
  constructor(message = 'User not found') {
    super(message);
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

export class SessionInvalidatedError extends Error {
  readonly code = 'SESSION_INVALIDATED';
  constructor(message = 'Session has been invalidated') {
    super(message);
    Object.setPrototypeOf(this, SessionInvalidatedError.prototype);
  }
}
// Typed errors for Auth domain (Phase 1)

export class AuthDisabledError extends Error {
  readonly code = 'AUTH_DISABLED';
  constructor(message = 'User is disabled') {
    super(message);
    Object.setPrototypeOf(this, AuthDisabledError.prototype);
  }
}

export class EmailNotVerifiedError extends Error {
  readonly code = 'EMAIL_NOT_VERIFIED';
  constructor(message = 'Email not verified') {
    super(message);
    Object.setPrototypeOf(this, EmailNotVerifiedError.prototype);
  }
}

export class SignupNotAllowedError extends Error {
  readonly code = 'SIGNUP_NOT_ALLOWED';
  constructor(message = 'Signup is not allowed') {
    super(message);
    Object.setPrototypeOf(this, SignupNotAllowedError.prototype);
  }
}

export class OwnerAlreadyExistsError extends Error {
  readonly code = 'OWNER_ALREADY_EXISTS';
  constructor(message = 'Owner already exists') {
    super(message);
    Object.setPrototypeOf(this, OwnerAlreadyExistsError.prototype);
  }
}

export class InvalidCredentialsError extends Error {
  readonly code = 'INVALID_CREDENTIALS';
  constructor(message = 'Invalid credentials') {
    super(message);
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

export class OwnerBootstrapError extends Error {
  readonly code = 'OWNER_BOOTSTRAP_ERROR';
  constructor(message = 'Owner bootstrap violation') {
    super(message);
    Object.setPrototypeOf(this, OwnerBootstrapError.prototype);
  }
}
