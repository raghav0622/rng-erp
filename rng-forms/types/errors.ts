/**
 * Typed form error handling for RNGForm
 * Provides discriminated union types for form-specific errors
 */

import { AppError, AppErrorCode, CustomError } from '@/lib/types';

export interface FormValidationError extends AppError {
  code: AppErrorCode.VALIDATION_ERROR;
  details: {
    validationErrors: Record<string, string[]>;
    fieldCount: number;
  };
}

export interface FormSubmissionError extends AppError {
  code: AppErrorCode.DB_ERROR | AppErrorCode.INTERNAL_ERROR;
  details: {
    step: 'validation' | 'preprocessing' | 'submit' | 'postprocessing';
    originalError?: string;
  };
}

export interface FormPermissionError extends AppError {
  code: AppErrorCode.PERMISSION_DENIED;
  details: {
    fieldName?: string;
    requiredRole?: string;
  };
}

export type FormError = FormValidationError | FormSubmissionError | FormPermissionError | AppError;

export class FormErrorHandler {
  /**
   * Create a validation error for specific form fields
   */
  static validationError(
    errors: Record<string, string[]>,
    message = 'Please check the form fields',
  ): CustomError {
    return CustomError.validation(errors, message);
  }

  /**
   * Create a submission error
   */
  static submissionError(
    step: 'validation' | 'preprocessing' | 'submit' | 'postprocessing',
    message: string,
    originalError?: string,
  ): CustomError {
    return new CustomError(AppErrorCode.INTERNAL_ERROR, message, { step, originalError });
  }

  /**
   * Create a permission error for a field
   */
  static fieldPermissionError(fieldName: string, message?: string): CustomError {
    return CustomError.permission(
      `edit-field:${fieldName}`,
      fieldName,
      message || `You don't have permission to edit ${fieldName}`,
    );
  }

  /**
   * Is this error a validation error?
   */
  static isValidationError(error: AppError): error is FormValidationError {
    return error.code === AppErrorCode.VALIDATION_ERROR;
  }

  /**
   * Is this error a submission error?
   */
  static isSubmissionError(error: AppError): error is FormSubmissionError {
    return [AppErrorCode.DB_ERROR, AppErrorCode.INTERNAL_ERROR].includes(error.code);
  }

  /**
   * Is this error a permission error?
   */
  static isPermissionError(error: AppError): error is FormPermissionError {
    return error.code === AppErrorCode.PERMISSION_DENIED;
  }

  /**
   * Get validation errors for a specific field
   */
  static getFieldErrors(error: AppError, fieldName: string): string[] {
    if (!this.isValidationError(error)) return [];
    return (error.details?.validationErrors as Record<string, string[]>)?.[fieldName] || [];
  }

  /**
   * Get all field errors
   */
  static getAllFieldErrors(error: AppError): Record<string, string[]> {
    if (!this.isValidationError(error)) return {};
    return (error.details?.validationErrors as Record<string, string[]>) || {};
  }
}
