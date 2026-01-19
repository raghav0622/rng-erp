// AssignmentService implementation enforcing all invariants for AssignmentScope

import type { AssignmentRepository } from '../../repositories/assignment.repository';
import type { RoleRepository } from '../../repositories/role.repository';
import type { UserRepository } from '../../repositories/user.repository';
import { FEATURE_REGISTRY } from '../feature/feature.registry';
import { RBAC_INVARIANTS } from '../rbac/rbac.invariants';
import {
  assertNoDuplicateAssignment,
  AssignmentInvariantViolationError,
} from './assignment.invariants';
import type { AssignmentService } from './assignment.service';
import type { Assignment, AssignmentScope } from './contract';

export class AssignmentServiceImpl implements AssignmentService {
  constructor(
    private readonly repo: AssignmentRepository,
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
  ) {}

  async createAssignment(input: {
    userId: string;
    feature: string;
    action: string;
    scope: AssignmentScope;
  }): Promise<void> {
    // 1. User existence
    const user = await this.userRepo.getById(input.userId);
    if (!user) throw new AssignmentInvariantViolationError('User does not exist');

    // 2. User role
    if (!user.role) throw new AssignmentInvariantViolationError('User has no role');

    // 3. Clients forbidden
    if (user.role === 'client')
      throw new AssignmentInvariantViolationError('Clients cannot receive assignments');

    // 4. Owner-only actions forbidden
    if (RBAC_INVARIANTS.OWNER_ONLY_ACTIONS.includes(input.action)) {
      throw new AssignmentInvariantViolationError('Owner-only actions cannot be assigned');
    }

    // 5. Feature existence
    const featureDef = FEATURE_REGISTRY.find((f) => f.feature === input.feature);
    if (!featureDef)
      throw new AssignmentInvariantViolationError('Feature does not exist in registry');

    // 6. Action existence
    if (!featureDef.actions.includes(input.action)) {
      throw new AssignmentInvariantViolationError('Action does not exist for feature');
    }

    // 7. Role ceiling (assignment may NOT grant actions not allowed by rolePermissions)
    const rolePerm = await this.roleRepo.getByRoleAndFeature(user.role, input.feature);
    if (!rolePerm || !rolePerm.actions.includes(input.action)) {
      throw new AssignmentInvariantViolationError(
        'Assignment would grant action not allowed by role',
      );
    }

    // 8. Scope correctness
    if (input.scope.type === 'resource' && !input.scope.resourceId) {
      throw new AssignmentInvariantViolationError('Resource-scoped assignment missing resourceId');
    }
    if (input.scope.type === 'feature' && input.scope.hasOwnProperty('resourceId')) {
      throw new AssignmentInvariantViolationError(
        'Feature-scoped assignment must not have resourceId',
      );
    }

    // 9. Duplicate prevention
    const allAssignments = await this.repo.getAllByUserId(input.userId);
    assertNoDuplicateAssignment(allAssignments, input);

    // 10. Create assignment
    await this.repo.create({
      userId: input.userId,
      feature: input.feature,
      action: input.action,
      scope: input.scope,
    } as Assignment);
  }

  async revokeAssignment(id: string): Promise<void> {
    // Soft delete or hard delete as per repo contract
    await this.repo.delete(id);
  }
}
