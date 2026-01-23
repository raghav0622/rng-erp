// Assignment Service Contract (orchestrator)
import type { Assignment, AssignmentScope } from './assignment.contract';

export interface AssignmentService {
  getAssignmentsForUser(userId: string): Promise<Assignment[]>;
  getAssignment(params: {
    userId: string;
    feature: string;
    action: string;
    scope?: AssignmentScope;
  }): Promise<Assignment | null>;
}
