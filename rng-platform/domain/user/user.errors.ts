// User Domain Error Codes
// All errors are typed and explainable.

export type UserErrorCode =
  | 'USER_NOT_FOUND'
  | 'USER_DUPLICATE_EMAIL'
  | 'USER_INVALID_STATUS'
  | 'USER_ROLE_CONFLICT'
  | 'USER_MISSING_REQUIRED_FIELD';
