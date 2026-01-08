export class ServiceError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class UnauthenticatedError extends ServiceError {
  constructor() {
    super('User is not authenticated');
    this.name = 'UnauthenticatedError';
  }
}

export class DisabledUserError extends ServiceError {
  constructor() {
    super('User account is disabled');
    this.name = 'DisabledUserError';
  }
}

export class ForbiddenError extends ServiceError {
  constructor() {
    super('Action is forbidden');
    this.name = 'ForbiddenError';
  }
}

export class InvariantViolationError extends ServiceError {
  constructor(message?: string) {
    super(message || 'Invariant violation');
    this.name = 'InvariantViolationError';
  }
}

export class ExecutionError extends ServiceError {
  constructor(message?: string) {
    super(message || 'Execution error');
    this.name = 'ExecutionError';
  }
}
