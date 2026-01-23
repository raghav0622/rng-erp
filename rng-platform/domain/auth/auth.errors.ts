// Auth Domain Error Codes
// All errors are typed and explainable.

export type AuthErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_LOCKED_OUT'
  | 'AUTH_EXPIRED'
  | 'AUTH_USER_NOT_FOUND'
  | 'AUTH_MISSING_REQUIRED_FIELD';
