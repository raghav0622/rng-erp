/**
 * Safe form submission handler with proper error handling and validation
 * Prevents common form submission issues (double submission, validation errors, etc.)
 */

import { AppError, AppErrorCode, Result } from '@/lib/types';
import { FormErrorHandler } from '../types/errors';

export interface FormSubmissionOptions<T> {
  onValidationError?: (errors: Record<string, string[]>) => void;
  onSubmissionError?: (error: AppError) => void;
  onSuccess?: (data: T) => void;
  debounceMs?: number;
}

export class FormSubmissionHandler {
  private isSubmitting = false;
  private lastSubmitTime = 0;
  private debounceTimer?: NodeJS.Timeout;

  /**
   * Handle form submission with proper validation and error handling
   */
  async handle<T>(
    values: Record<string, unknown>,
    onSubmit: (values: Record<string, unknown>) => Promise<Result<T>>,
    options: FormSubmissionOptions<T> = {},
  ): Promise<Result<T> | null> {
    // Prevent double submission
    if (this.isSubmitting) {
      return null;
    }

    // Debounce rapid submissions
    const now = Date.now();
    const debounceMs = options.debounceMs ?? 300;
    if (now - this.lastSubmitTime < debounceMs) {
      return null;
    }

    this.isSubmitting = true;
    this.lastSubmitTime = now;

    try {
      const result = await onSubmit(values);

      // Patch: support Result type ({ ok, value, error })
      if (!result.ok) {
        // Patch: wrap error as AppError if needed
        const appError: AppError =
          result.error instanceof Error && !(result.error as any).code
            ? new AppError(result.error.message, AppErrorCode.INTERNAL_ERROR)
            : (result.error as AppError);
        this.handleError(appError, options);
        return { ok: false, error: appError };
      }

      options.onSuccess?.(result.value);
      return result;
    } catch (error) {
      const appError =
        error instanceof Error
          ? { code: 'INTERNAL_ERROR' as const, message: error.message }
          : { code: 'UNKNOWN' as const, message: 'Unknown error' };

      // Patch: ensure typedError is an instance of AppError
      const typedError: AppError =
        error instanceof AppError
          ? error
          : new AppError(appError.message, appError.code as AppErrorCode);

      this.handleError(typedError, options);
      // Patch: return Result type for error case
      return { ok: false, error: typedError };
    } finally {
      this.isSubmitting = false;
    }
  }

  private handleError<T>(error: AppError, options: FormSubmissionOptions<T>): void {
    if (FormErrorHandler.isValidationError(error)) {
      const errors = FormErrorHandler.getAllFieldErrors(error);
      options.onValidationError?.(errors);
    } else {
      options.onSubmissionError?.(error);
    }
  }

  /**
   * Validate form values synchronously
   */
  static validateSync(
    values: Record<string, unknown>,
    schema: { parse: (data: unknown) => unknown },
  ): Record<string, string[]> | null {
    try {
      schema.parse(values);
      return null;
    } catch (error) {
      if (error instanceof Error && error.message.includes('validation')) {
        return { root: [error.message] };
      }
      return null;
    }
  }

  /**
   * Check if form is currently submitting
   */
  isLoading(): boolean {
    return this.isSubmitting;
  }

  /**
   * Cancel any pending debounced submission
   */
  cancel(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }

  /**
   * Reset handler state
   */
  reset(): void {
    this.isSubmitting = false;
    this.lastSubmitTime = 0;
    this.cancel();
  }
}
