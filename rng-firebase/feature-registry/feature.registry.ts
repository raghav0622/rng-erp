import { RBACMisconfigurationError } from '../domain/rbac/rbac.errors';
import { KernelInvariantViolationError } from '../kernel-errors';

export interface FeatureDefinition {
  feature: string;
  actions: readonly string[];
}

let _featureRegistry: readonly FeatureDefinition[] | undefined = undefined;
let _initialized = false;

  // Only kernel may initialize registry; mark as @internal
  if (_initialized) {
    throw new KernelInvariantViolationError('Feature registry already initialized');
  }
  if ((globalThis as any).__rng_feature_registry_initialized) {
    throw new KernelInvariantViolationError('Feature registry boot refused: external mutation detected');
  }
  _featureRegistry = Object.freeze(
    defs.map((f) => Object.freeze({ ...f, actions: Object.freeze([...f.actions]) })),
  );
  _initialized = true;
  (globalThis as any).__rng_feature_registry_initialized = true;
}

  if (!_initialized || !_featureRegistry) {
    throw new RBACMisconfigurationError('Feature registry not initialized');
  }
  return _featureRegistry;
}
