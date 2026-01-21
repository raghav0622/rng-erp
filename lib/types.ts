// Polyfill for AppError and Result for form and utils compatibility
export enum AppErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DB_ERROR = 'DB_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

export class AppError extends Error {
  code: AppErrorCode;
  details?: any;
  constructor(message: string, code: AppErrorCode, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: Error };
