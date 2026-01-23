// RBAC Service Contract (orchestrator)
import type { Assignment, AssignmentScope } from '../assignment/assignment.contract';
import type { User } from '../user/user.contract';
import type { RBACReason } from './rbac.reasons';

export interface RBACService {
  check(params: {
    user: User;
    feature: string;
    action: string;
    scope?: AssignmentScope;
    assignments: Assignment[];
    registry: ReadonlyArray<{ id: string; actions: ReadonlyArray<string> }>;
  }): { allowed: boolean; reason: RBACReason };
}
