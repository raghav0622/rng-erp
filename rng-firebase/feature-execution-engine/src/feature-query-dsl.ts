export interface QueryFeatureDefinition<TResult = unknown> {
  name: string;
  feature: string;
  action: string;
  permissions?: true;
  query: (
    ctx: import('../../auth-rbac-user-management-layer/shared/execution-context').ExecutionContext,
  ) => Promise<TResult>;
}

export function defineQueryFeature<TResult>(def: QueryFeatureDefinition<TResult>) {
  return def;
}
