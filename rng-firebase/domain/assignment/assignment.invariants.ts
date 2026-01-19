// Assignment invariants for kernel enforcement
// All assignment creation must go through AssignmentService

import type { Assignment, AssignmentScope } from './contract';
/**
 * Throws AssignmentInvariantViolationError if a duplicate assignment exists for the same userId, feature, action, and scope.
 * @param assignments - All assignments to check (including the new one)
 * @param candidate - The assignment to check for duplication
 */
export function assertNoDuplicateAssignment(
  assignments: Assignment[],
  candidate: {
    userId: string;
    feature: string;
    action: string;
    scope: AssignmentScope;
  },
): void {
  const duplicate = assignments.find(
    (a) =>
      a.userId === candidate.userId &&
      a.feature === candidate.feature &&
      a.action === candidate.action &&
      compareAssignmentScope(a.scope, candidate.scope),
  );
  if (duplicate) {
    throw new AssignmentInvariantViolationError(
      `Duplicate assignment for userId=${candidate.userId}, feature=${candidate.feature}, action=${
        candidate.action
      }, scope=${JSON.stringify(candidate.scope)}`,
    );
  }
}

/**
 * Compares two AssignmentScope objects for deep equality.
 */
export function compareAssignmentScope(a: AssignmentScope, b: AssignmentScope): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'feature') return true;
  if (a.type === 'resource' && b.type === 'resource') {
    return a.resourceId === b.resourceId;
  }
  return false;
}

export const ASSIGNMENT_INVARIANTS = {
  OWNER_ONLY_ACTIONS_FORBIDDEN: true,
  CLIENT_ASSIGNMENTS_FORBIDDEN: true,
  ESCALATION_FORBIDDEN: true,
  UNIQUENESS_REQUIRED: true, // Enforced by assertNoDuplicateAssignment
  REPOSITORY_INTERNAL_ONLY: true,
};

export class AssignmentInvariantViolationError extends Error {
  readonly code = 'ASSIGNMENT_INVARIANT_VIOLATION';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AssignmentInvariantViolationError.prototype);
  }
}
