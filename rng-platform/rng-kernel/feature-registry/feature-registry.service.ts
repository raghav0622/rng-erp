// Feature Registry Service (Phase 1)
// Validates and deep-freezes the feature registry.

import type { FeatureDefinition } from '../bootstrap/bootstrap.contract';
import type { KernelInvariantViolationError } from '../errors/kernel.errors';

export function validateFeatureRegistry(registry: FeatureDefinition[]): void {
  if (!Array.isArray(registry) || registry.length === 0) {
    const err: KernelInvariantViolationError = {
      type: 'KERNEL_INVARIANT_VIOLATION',
      invariant: 'FEATURE_REGISTRY_NON_EMPTY',
      explanation: 'Feature registry must be a non-empty array.',
    };
    throw err;
  }
  const ids = registry.map((f) => f.id);
  if (ids.some((id) => typeof id !== 'string' || !id.trim())) {
    const err: KernelInvariantViolationError = {
      type: 'KERNEL_INVARIANT_VIOLATION',
      invariant: 'FEATURE_ID_NON_EMPTY',
      explanation: 'All feature IDs must be non-empty strings.',
    };
    throw err;
  }
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) {
    const err: KernelInvariantViolationError = {
      type: 'KERNEL_INVARIANT_VIOLATION',
      invariant: 'FEATURE_ID_UNIQUE',
      explanation: 'Feature IDs must be globally unique.',
    };
    throw err;
  }
  for (const feature of registry) {
    if (!Array.isArray(feature.actions) || feature.actions.length === 0) {
      const err: KernelInvariantViolationError = {
        type: 'KERNEL_INVARIANT_VIOLATION',
        invariant: 'FEATURE_ACTIONS_NON_EMPTY',
        explanation: `Feature '${feature.id}' must have a non-empty actions array.`,
      };
      throw err;
    }
    if (feature.actions.some((a) => a === '*' || typeof a !== 'string' || !a.trim())) {
      const err: KernelInvariantViolationError = {
        type: 'KERNEL_INVARIANT_VIOLATION',
        invariant: 'FEATURE_ACTION_INVALID',
        explanation: `Feature '${feature.id}' has invalid or wildcard action.`,
      };
      throw err;
    }
    const actionSet = new Set(feature.actions);
    if (actionSet.size !== feature.actions.length) {
      const err: KernelInvariantViolationError = {
        type: 'KERNEL_INVARIANT_VIOLATION',
        invariant: 'FEATURE_ACTION_UNIQUE',
        explanation: `Feature '${feature.id}' has duplicate actions.`,
      };
      throw err;
    }
  }
}

export function deepFreezeFeatureRegistry(
  registry: FeatureDefinition[],
): ReadonlyArray<FeatureDefinition> {
  for (const feature of registry) {
    Object.freeze(feature.actions);
    Object.freeze(feature);
  }
  return Object.freeze([...registry]);
}
