import type { AppAuthError, AppAuthErrorCode } from './app-auth.errors';

/**
 * Maps AppAuthError codes to user-friendly error messages.
 * This utility should be used by UI components to display errors to users.
 * The error messages are designed to be helpful while maintaining security.
 */
export const authErrorMessages: Record<AppAuthErrorCode, string | string[]> = {
  'auth/invalid-credentials':
    'Invalid email or password. Please check your credentials and try again.',
  'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
  'auth/weak-password':
    'Password is too weak. Please use at least 8 characters with uppercase, lowercase, numbers, and symbols.',
  'auth/invalid-email': 'Email address format is invalid.',
  'auth/invalid-input': 'Invalid input provided. Please check your entries and try again.',
  'auth/too-many-requests':
    'Too many failed attempts. Please wait a few minutes before trying again.',
  'auth/user-disabled': 'Your account has been disabled. Please contact your administrator.',
  'auth/session-expired': 'Your session has expired. Please sign in again.',
  'auth/not-authenticated': 'Authentication failed. Please try again.',
  'auth/not-authorized':
    'You are not authorized to perform this action. Please contact your administrator.',
  'auth/invite-invalid':
    'No invitation found for this email address. Please check your email or request a new invitation.',
  'auth/invite-already-accepted': 'This invitation has already been used. Please sign in instead.',
  'auth/invite-revoked': 'This invitation has been cancelled. Please contact your administrator.',
  'auth/owner-already-exists': [
    'An owner account already exists.',
    'Please use the sign in page to access your account.',
  ],
  'auth/owner-bootstrap-race': [
    'Another user completed setup while you were filling out the form.',
    'The system has been cleaned up automatically.',
    'Please sign in with the existing owner account instead.',
  ],
  'auth/invariant-violation': 'An unexpected error occurred. Please try again or contact support.',
  'auth/infrastructure-error':
    'Network error occurred. Please check your connection and try again.',
  'auth/internal': 'An error occurred. Please try again or contact support.',
};

/**
 * Get a user-friendly error message for an AppAuthError
 * Returns a string or array of strings for better context
 */
export function getAuthErrorMessage(error: unknown): string | string[] {
  if (!error || typeof error !== 'object') {
    return authErrorMessages['auth/internal'];
  }

  const appError = error as AppAuthError;

  // If we have a custom message that's not the default, use it
  if (appError.message && appError.message !== authErrorMessages['auth/internal']) {
    // Check if the message is not one of our predefined ones
    const message = appError.message;
    if (!Object.values(authErrorMessages).flat().includes(message)) {
      return message;
    }
  }

  // Return the mapped message for this error code
  return authErrorMessages[appError.code] || authErrorMessages['auth/internal'];
}

/**
 * Convert error message(s) to an array format for consistency
 */
export function normalizeErrorMessage(message: string | string[]): string[] {
  return Array.isArray(message) ? message : [message];
}
