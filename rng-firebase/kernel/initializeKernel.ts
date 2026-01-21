// initializeKernel: The ONLY entrypoint for sealed ERP kernel initialization
// ABSOLUTE: No dynamic wiring, no late mutation, no TODOs, no silent behavior

import type { KernelHostConfig, SealedKernel } from './KernelHostContract';

export function initializeKernel(config: KernelHostConfig): SealedKernel {
  // Preflight validation
  if (
    !config.userRepository ||
    !config.assignmentRepository ||
    !config.roleRepository ||
    !config.auditRepository ||
    !config.inviteRepository ||
    !config.featureExecutionPipeline
  ) {
    throw new Error('Kernel boot failed: missing required repository or pipeline');
  }

  // Validate feature registry initialization and uniqueness
  const registry =
    (config.featureExecutionPipeline as any).registry ||
    (config.featureExecutionPipeline as any).features;
  if (!registry || !Array.isArray(registry) || registry.length === 0) {
    throw new Error('Kernel boot failed: feature registry not initialized');
  }
  const seen = new Set<string>();
  for (const f of registry) {
    const key = `${f.feature}:${f.action}`;
    if (seen.has(key)) {
      throw new Error(`Kernel boot failed: duplicate feature+action pair detected (${key})`);
    }
    seen.add(key);
  }

  // Freeze all config objects to prevent mutation
  Object.freeze(config);
  Object.freeze(config.userRepository);
  Object.freeze(config.assignmentRepository);
  Object.freeze(config.roleRepository);
  Object.freeze(config.auditRepository);
  Object.freeze(config.inviteRepository);
  Object.freeze(config.featureExecutionPipeline);

  // Return only the sealed feature execution facade
  return {
    executeFeature: config.featureExecutionPipeline.executeFeature,
    // Planned: auth/UI hooks, RBAC guards
  };
}
