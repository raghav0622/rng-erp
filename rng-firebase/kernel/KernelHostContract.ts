import type { FeatureExecutionPipeline } from '../feature-execution-engine/contracts/feature-execution-pipeline';
import type { AssignmentRepository } from '../repositories/assignment.repository';
import type { AuditRepository } from '../repositories/audit.repository';
import type { InviteRepository } from '../repositories/invite.repository';
import type { RoleRepository } from '../repositories/role.repository';
import type { UserRepository } from '../repositories/user.repository';
export type KernelHostConfig = {
  userRepository: UserRepository;
  assignmentRepository: AssignmentRepository;
  roleRepository: RoleRepository;
  auditRepository: AuditRepository;
  inviteRepository: InviteRepository;
  featureExecutionPipeline: FeatureExecutionPipeline;
};
export interface SealedKernel {
  executeFeature: FeatureExecutionPipeline['executeFeature'];
}
