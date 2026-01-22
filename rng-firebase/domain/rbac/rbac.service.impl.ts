// RBACService implementation for AssignmentScope model
import type { AssignmentRepository } from '../../repositories/assignment.repository';
import type { RoleRepository } from '../../repositories/role.repository';
import { getFeatureRegistry } from '../feature/feature.registry';
import { evaluateRBAC } from './rbac.engine';
import { RBACForbiddenError, RBACMisconfigurationError } from './rbac.errors';
import { RBACInputValidator } from './rbac.input-validator';
import { RBACDenialReason } from './rbac.reasons';
import type { RBACService } from './rbac.service';
import type { RBACInput } from './rbac.types';
import type { AuditService } from '../audit/audit.service';
import { AuditEventType } from '../audit/audit.types';

export class RBACServiceImpl implements RBACService {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly assignmentRepo: AssignmentRepository,
    private readonly auditService: AuditService,
  ) {}

  async check(input: RBACInput): Promise<void> {
    // Use RBACInputValidator for feature/action checks
    const featureRegistry = getFeatureRegistry();
    const validator = new RBACInputValidator([...featureRegistry]);
    try {
      validator.validate(input);
    } catch (err: any) {
      await this.auditService.record({
        type: AuditEventType.FEATURE_FAILED,
        actor: input.userId,
        target: input.feature,
        reason: 'RBACInput validation failed',
        timestamp: Date.now(),
        details: { input, error: err },
      });
      if (err instanceof RBACForbiddenError) {
        throw err;
      }
      if (err instanceof RBACMisconfigurationError) {
        throw err;
      }
      throw err;
    }

    const rolePermissions = await this.roleRepo.getByRoleAndFeature(input.role, input.feature);
    if (!rolePermissions) {
      await this.auditService.record({
        type: AuditEventType.RBAC_DENIED,
        actor: input.userId,
        target: input.feature,
        reason: 'Role configuration missing for RBAC',
        timestamp: Date.now(),
        details: { input },
      });
      throw new RBACMisconfigurationError('Role configuration missing for RBAC');
    }
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
      if (decision.reason === RBACDenialReason.ROLE_MISCONFIGURED) {
        await this.auditService.record({
          type: AuditEventType.RBAC_DENIED,
          actor: input.userId,
          target: input.feature,
          reason: 'RBAC misconfiguration detected',
          timestamp: Date.now(),
          details: { input, decision },
        });
        throw new RBACMisconfigurationError('RBAC misconfiguration detected');
      }
      await this.auditService.record({
        type: AuditEventType.RBAC_DENIED,
        actor: input.userId,
        target: input.feature,
        reason: 'RBAC access denied',
        timestamp: Date.now(),
        details: { input, decision },
      });
      throw new RBACForbiddenError(decision.reason, 'RBAC access denied');
    }
    // If allowed, emit RBAC_GRANTED audit event
    await this.auditService.record({
      type: AuditEventType.RBAC_GRANTED,
      actor: input.userId,
      target: input.feature,
      reason: 'RBAC access granted',
      timestamp: Date.now(),
      details: { input, decision },
    });
  }
}
}
