// RBACService implementation for AssignmentScope model
import type { AssignmentRepository } from '../../repositories/assignment.repository';
import type { RoleRepository } from '../../repositories/role.repository';
import { evaluateRBAC } from './rbac.engine';
import { RBACForbiddenError, RBACMisconfigurationError } from './rbac.errors';
import type { RBACService } from './rbac.service';
import type { RBACDecision, RBACInput } from './rbac.types';

export class RBACServiceImpl implements RBACService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly assignmentRepo: AssignmentRepository,
  ) {}

  async check(input: RBACInput): Promise<RBACDecision> {
    const rolePermissions = await this.roleRepo.getByRoleAndFeature(input.role, input.feature);
    if (!rolePermissions)
      throw new RBACMisconfigurationError('Role configuration missing for RBAC');
    let assignment = null;
    if (input.role === 'employee') {
      assignment = await this.assignmentRepo.getByUserIdFeatureActionScope(
        input.userId,
        input.feature,
        input.action,
        input.scope,
      );
    }
    const decision = evaluateRBAC(input, rolePermissions, assignment);
    if (!decision.allowed) throw new RBACForbiddenError(decision.reason);
    return decision;
  }
}
