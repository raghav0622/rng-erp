export enum RepositoryErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
  CONFLICT = 'CONFLICT',
  UNKNOWN = 'UNKNOWN',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  BATCH_FAILED = 'BATCH_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  MIGRATION_FAILED = 'MIGRATION_FAILED',
  FAILED_PRECONDITION = 'FAILED_PRECONDITION',
  OFFLINE_QUEUED = 'OFFLINE_QUEUED',
}

export class RepositoryError extends Error {
  public readonly code: RepositoryErrorCode;
  public readonly originalError?: unknown;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: RepositoryErrorCode = RepositoryErrorCode.UNKNOWN,
    originalError?: unknown,
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.originalError = originalError;
    this.context = context;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RepositoryError);
    }
  }

  static fromError(error: unknown, context?: Record<string, any>): RepositoryError {
    if (error instanceof RepositoryError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    let code = RepositoryErrorCode.UNKNOWN;

    // Map Firestore error codes to RepositoryErrorCode
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const fsCode = (error as any).code;
      switch (fsCode) {
        case 'permission-denied':
          code = RepositoryErrorCode.PERMISSION_DENIED;
          break;
        case 'not-found':
          code = RepositoryErrorCode.NOT_FOUND;
          break;
        case 'failed-precondition':
          code = RepositoryErrorCode.INVALID_ARGUMENT;
          break;
        case 'aborted':
          code = RepositoryErrorCode.CONCURRENT_MODIFICATION;
          break;
        default:
          code = RepositoryErrorCode.UNKNOWN;
      }
    }

    return new RepositoryError(message, code, error, context);
  }
}
