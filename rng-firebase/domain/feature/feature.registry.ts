import { KernelInvariantViolationError } from '../../kernel-errors';
import { RBACMisconfigurationError } from '../rbac/rbac.errors';
/**
 * Feature registry is externally initialized by the host application at kernel bootstrap.
 * Kernel does not define or own feature definitions. No features are shipped by the kernel.
 * All features and their allowed actions must be registered by the host.
 *
 * Forbidden:
 * - Populating FEATURE_REGISTRY inside kernel
 * - Lazy initialization
 * - Auto-registration
 * - Default features
 * - Silent fallback behavior
 *
 * Success Criteria:
 * - Kernel boots with explicit feature registry injection
 * - Feature-less kernel denies all feature access deterministically
 * - No feature logic exists inside kernel
 * - RBAC remains pure and deterministic
 * - Kernel = execution + enforcement; Application = feature definition
 */

export interface FeatureDefinition {
  feature: string;
  actions: readonly string[];
}

let _featureRegistry: readonly FeatureDefinition[] | undefined = undefined;
let _initialized = false;

/**
 * Initializes the feature registry. Can be called exactly once at kernel bootstrap.
 * @param defs Feature definitions (may be empty, which means deny all features)
 * @throws KernelInvariantViolationError if called more than once
 */
export function initializeFeatureRegistry(defs: readonly FeatureDefinition[]): void {
  if (_initialized) {
    throw new KernelInvariantViolationError('Feature registry already initialized');
  }
  _featureRegistry = Object.freeze(
    defs.map((f) => Object.freeze({ ...f, actions: Object.freeze([...f.actions]) })),
  );
  _initialized = true;
}

/**
 * Returns the current feature registry (deep frozen, read-only).
 * @throws RBACMisconfigurationError if registry is not initialized
 */
export function getFeatureRegistry(): readonly FeatureDefinition[] {
  if (!_initialized || !_featureRegistry) {
    throw new RBACMisconfigurationError('Feature registry not initialized');
  }
  return _featureRegistry;
}
