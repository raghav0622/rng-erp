// RBACService implementation for AssignmentScope model
import type { AssignmentRepository } from '../../repositories/assignment.repository';
import type { RoleRepository } from '../../repositories/role.repository';
import { getFeatureRegistry } from '../feature/feature.registry';
import { evaluateRBAC } from './rbac.engine';
import { RBACForbiddenError } from './rbac.errors';
import type { RBACService } from './rbac.service';
import type { RBACInput } from './rbac.types';

export class RBACServiceImpl implements RBACService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly assignmentRepo: AssignmentRepository,
  ) {}

  async check(input: RBACInput): Promise<void> {
    // Feature/action existence validation
    let featureDef: { feature: string; actions: readonly string[] } | undefined;
    try {
      featureDef = getFeatureRegistry().find((f) => f.feature === input.feature);
    } catch (err: any) {
      throw new RBACForbiddenError('Feature registry not initialized');
    }
    if (!featureDef) {
      throw new RBACForbiddenError('Feature does not exist');
    }
    if (!featureDef.actions.includes(input.action)) {
      throw new RBACForbiddenError('Action does not exist for feature');
    }

    const rolePermissions = await this.roleRepo.getByRoleAndFeature(input.role, input.feature);
    if (!rolePermissions) throw new RBACForbiddenError('Role configuration missing for RBAC');
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
    if (!decision.allowed) {
      throw new RBACForbiddenError('RBAC access denied');
    }
    // If allowed, return void (success)
  }
}
