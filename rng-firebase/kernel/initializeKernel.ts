import { KernelInvariantViolationError } from '../kernel-errors';
import type { KernelHostConfig, SealedKernel } from './KernelHostContract';
export function initializeKernel(config: KernelHostConfig): SealedKernel {
  if (
    !config.userRepository ||
    !config.assignmentRepository ||
    !config.roleRepository ||
    !config.auditRepository ||
    !config.inviteRepository ||
    !config.featureExecutionPipeline
  )
    throw new KernelInvariantViolationError(
      'Kernel boot failed: missing required repository or pipeline',
    );
  // Use domain feature registry as the single source of truth
  const registry = require('../feature-registry/feature.registry').getFeatureRegistry();
  if (!registry || !Array.isArray(registry) || registry.length === 0)
    throw new KernelInvariantViolationError('Kernel boot failed: feature registry not initialized');
  const seen = new Set<string>();
  for (const f of registry) {
    for (const action of f.actions) {
      const key = `${f.feature}:${action}`;
      if (seen.has(key))
        throw new KernelInvariantViolationError(
          `Kernel boot failed: duplicate feature+action pair detected (${key})`,
        );
      seen.add(key);
    }
  }
  Object.freeze(config);
  Object.freeze(config.userRepository);
  Object.freeze(config.assignmentRepository);
  Object.freeze(config.roleRepository);
  Object.freeze(config.auditRepository);
  Object.freeze(config.inviteRepository);
  Object.freeze(config.featureExecutionPipeline);
  return { executeFeature: config.featureExecutionPipeline.executeFeature };
}
