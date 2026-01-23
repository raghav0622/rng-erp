export type RBACError =
  | { type: 'RBAC_DENIED'; reason: import('./rbac.reasons').RBACReason }
  | { type: 'RBAC_ASSIGNMENT_ERROR'; reason: import('./rbac.reasons').RBACReason }
  | { type: 'RBAC_INVARIANT_VIOLATION'; explanation: string };
// RBAC Domain Error Codes
// All errors are typed and explainable.

export type RBACErrorCode =
  | 'RBAC_ROLE_NOT_ASSIGNED'
  | 'RBAC_PERMISSION_DENIED'
  | 'RBAC_INVALID_ROLE'
  | 'RBAC_EXPLICIT_DENY'
  | 'RBAC_MISSING_REQUIRED_FIELD';
