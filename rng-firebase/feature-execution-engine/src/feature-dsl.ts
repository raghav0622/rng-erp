export interface FeatureDefinition {
  feature: string;
  actions: string[];
  permissions?: true;
}

export function defineFeature(def: FeatureDefinition) {
  return def;
}
