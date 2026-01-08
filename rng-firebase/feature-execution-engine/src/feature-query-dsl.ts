export interface FeatureQueryDefinition {
  feature: string;
  query: string;
  permissions?: true;
}

export function defineFeatureQuery(def: FeatureQueryDefinition) {
  return def;
}
