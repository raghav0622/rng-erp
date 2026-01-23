// Feature Registry Contract
// No implementation. No runtime logic.

export interface FeatureDefinition {
  id: string; // Unique, case-sensitive
  actions: ReadonlyArray<string>; // Unique per feature
}

/**
 * The feature registry is:
 * - Initialized externally (passed to bootstrap)
 * - Frozen after bootstrap
 * - Read-only to the kernel (never mutated)
 * - Not hardcoded; always passed in
 * - No wildcards, no case folding
 */
export interface FeatureRegistry {
  features: ReadonlyArray<FeatureDefinition>;
}
