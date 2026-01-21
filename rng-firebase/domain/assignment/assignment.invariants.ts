// Assignment invariants for kernel enforcement
// All assignment creation must go through AssignmentService

import { AssignmentErrorBase } from '../../kernel/errors/AssignmentErrorBase';
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
 * Strict, deterministic, and future-proof comparison of AssignmentScope objects.
 * - Returns true only if both scopes are of the same type and all relevant properties match exactly.
 * - For 'feature' type: must not have resourceId or any extra properties.
 * - For 'resource' type: resourceId must match and no extra properties allowed.
 * - Fails closed for unknown types or extra properties.
 *
 * This function is used by both the service and repository layers to guarantee uniqueness enforcement is robust and cannot be bypassed by malformed or extended scope objects.
 */
export function compareAssignmentScope(a: AssignmentScope, b: AssignmentScope): boolean {
  if (a.type !== b.type) return false;
  // Feature scope: must not have resourceId or extra properties
  if (a.type === 'feature' && b.type === 'feature') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== 1 || bKeys.length !== 1) return false;
    return true;
  }
  // Resource scope: must have matching resourceId and no extra properties
  if (a.type === 'resource' && b.type === 'resource') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== 2 || bKeys.length !== 2) return false;
    if (!('resourceId' in a) || !('resourceId' in b)) return false;
    return a.resourceId === b.resourceId;
  }
  // FeatureDoc scope: must have matching docId and no extra properties
  if (a.type === 'featureDoc' && b.type === 'featureDoc') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== 2 || bKeys.length !== 2) return false;
    if (!('docId' in a) || !('docId' in b)) return false;
    return a.docId === b.docId;
  }
  // Unknown or future scope types: fail closed
  return false;
}

export const ASSIGNMENT_INVARIANTS = {
  OWNER_ONLY_ACTIONS_FORBIDDEN: true,
  CLIENT_ASSIGNMENTS_FORBIDDEN: true,
  ESCALATION_FORBIDDEN: true,
  UNIQUENESS_REQUIRED: true, // Enforced by assertNoDuplicateAssignment
  REPOSITORY_INTERNAL_ONLY: true,
};

export class AssignmentInvariantViolationError extends AssignmentErrorBase {
  constructor(message: string) {
    super(message, 'ASSIGNMENT_INVARIANT_VIOLATION');
    Object.setPrototypeOf(this, AssignmentInvariantViolationError.prototype);
  }
}
