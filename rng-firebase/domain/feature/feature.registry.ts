// Canonical feature registry for kernel RBAC
// All features and their allowed actions must be registered here.

export interface FeatureDefinition {
  feature: string;
  actions: readonly string[];
}

// FEATURE_REGISTRY is frozen at kernel bootstrap. No runtime mutation allowed.
export const FEATURE_REGISTRY: readonly FeatureDefinition[] = Object.freeze([]);
