// Canonical feature registry for kernel RBAC
// All features and their allowed actions must be registered here.

export interface FeatureDefinition {
  feature: string;
  actions: readonly string[];
}

export const FEATURE_REGISTRY: readonly FeatureDefinition[] = [];
