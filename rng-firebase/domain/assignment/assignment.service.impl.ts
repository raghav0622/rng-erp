// AssignmentService implementation enforcing all invariants for AssignmentScope

import type { AssignmentRepository } from '../../repositories/assignment.repository';
import type { RoleRepository } from '../../repositories/role.repository';
import type { UserRepository } from '../../repositories/user.repository';
import type { AuditService } from '../audit/audit.service';
import { AuditEventType } from '../audit/audit.types';
import { RBAC_INVARIANTS } from '../rbac/rbac.invariants';
import { AssignmentInvariantViolationError } from './assignment.invariants';
import type { AssignmentService } from './assignment.service';
import type { Assignment, AssignmentScope } from './contract';

import { ExecutionContextService } from '../auth/execution-context.service';

export class AssignmentServiceImpl implements AssignmentService {
  constructor(
    private readonly repo: AssignmentRepository,
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
    private readonly auditService: AuditService,
  ) {}

  async createAssignment(input: {
    userId: string;
    feature: string;
    action: string;
    scope: AssignmentScope;
  }): Promise<void> {
    // 1. User existence
    const user = await this.userRepo.getById(input.userId);
    if (!user) {
      await this.auditService.record({
        type: AuditEventType.ASSIGNMENT_CREATE_FAILED,
        actor: input.userId,
        target: input.feature,
        reason: 'User does not exist',
        timestamp: Date.now(),
        details: { input },
      });
      throw new AssignmentInvariantViolationError('User does not exist');
    }

    // 2. User role
    if (!user.role) {
      await this.auditService.record({
        type: AuditEventType.ASSIGNMENT_CREATE_FAILED,
        actor: input.userId,
        target: input.feature,
        reason: 'User has no role',
        timestamp: Date.now(),
        details: { input },
      });
      throw new AssignmentInvariantViolationError('User has no role');
    }

    // 3. Clients forbidden
    if (user.role === 'client') {
      await this.auditService.record({
        type: AuditEventType.ASSIGNMENT_CREATE_FAILED,
        actor: input.userId,
        target: input.feature,
        reason: 'Clients cannot receive assignments',
        timestamp: Date.now(),
        details: { input },
      });
      throw new AssignmentInvariantViolationError('Clients cannot receive assignments');
    }

    // 4. Owner-only actions forbidden
    if (RBAC_INVARIANTS.OWNER_ONLY_ACTIONS.includes(input.action)) {
      await this.auditService.record({
        type: AuditEventType.ASSIGNMENT_CREATE_FAILED,
        actor: input.userId,
        target: input.feature,
        reason: 'Owner-only actions cannot be assigned',
        timestamp: Date.now(),
        details: { input },
      });
      throw new AssignmentInvariantViolationError('Owner-only actions cannot be assigned');
    }

    // Feature/action existence is enforced by RBACService. AssignmentService only enforces assignment invariants.

    // 7. Role ceiling (assignment may NOT grant actions not allowed by rolePermissions)
    const rolePerm = await this.roleRepo.getByRoleAndFeature(user.role, input.feature);
    if (!rolePerm || !rolePerm.actions.includes(input.action)) {
      await this.auditService.record({
        type: AuditEventType.ASSIGNMENT_INVARIANT_VIOLATION,
        actor: input.userId,
        target: input.feature,
        reason: 'Assignment would grant action not allowed by role',
        timestamp: Date.now(),
        details: { input },
      });
      throw new AssignmentInvariantViolationError(
        'Assignment would grant action not allowed by role',
      );
    }

    // 8. Scope correctness
    if (input.scope.type === 'resource') {
      if (!('resourceId' in input.scope) || !input.scope.resourceId) {
        throw new AssignmentInvariantViolationError(
          'Resource-scoped assignment missing resourceId',
        );
      }
      if (Object.keys(input.scope).length !== 2) {
        throw new AssignmentInvariantViolationError(
          'Resource-scoped assignment must not have extra properties',
        );
      }
    }
    if (input.scope.type === 'feature') {
      if ('resourceId' in input.scope || 'docId' in input.scope) {
        throw new AssignmentInvariantViolationError(
          'Feature-scoped assignment must not have resourceId or docId',
        );
      }
      if (Object.keys(input.scope).length !== 1) {
        throw new AssignmentInvariantViolationError(
          'Feature-scoped assignment must not have extra properties',
        );
      }
    }
    if (input.scope.type === 'featureDoc') {
      if (!('docId' in input.scope) || !input.scope.docId) {
        throw new AssignmentInvariantViolationError('FeatureDoc-scoped assignment missing docId');
      }
      if (Object.keys(input.scope).length !== 2) {
        throw new AssignmentInvariantViolationError(
          'FeatureDoc-scoped assignment must not have extra properties',
        );
      }
    }

    // 9. Duplicate prevention (repository-level uniqueness enforcement)
    try {
      await this.repo.ensureAssignmentUnique(
        input.userId,
        input.feature,
        input.action,
        input.scope,
      );
    } catch (err: any) {
      // Only catch repository errors, rethrow as invariant violation
      if (err?.name === 'RepositoryError') {
        throw new AssignmentInvariantViolationError('Assignment uniqueness check failed');
      }
      throw err;
    }

    // 10. Create assignment
    await this.repo.create({
      userId: input.userId,
      feature: input.feature,
      action: input.action,
      scope: input.scope,
    } as Assignment);
    // Invalidate all execution contexts after assignment change
    ExecutionContextService.invalidateAll();
  }

  async revokeAssignment(id: string): Promise<void> {
    // Soft delete or hard delete as per repo contract
    await this.repo.delete(id);
    // Invalidate all execution contexts after assignment change
    ExecutionContextService.invalidateAll();
  }
}
