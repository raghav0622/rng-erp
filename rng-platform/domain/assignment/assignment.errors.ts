export type AssignmentError =
  | { type: 'ASSIGNMENT_NOT_FOUND'; reason: string }
  | { type: 'ASSIGNMENT_INVARIANT_VIOLATION'; explanation: string };
// Assignment Domain Error Codes
// All errors are typed and explainable.

export type AssignmentErrorCode =
  | 'ASSIGNMENT_NOT_FOUND'
  | 'ASSIGNMENT_DUPLICATE'
  | 'ASSIGNMENT_INVALID_STATUS'
  | 'ASSIGNMENT_ORPHANED'
  | 'ASSIGNMENT_MISSING_REQUIRED_FIELD';
