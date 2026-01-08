export interface CommandFeatureDefinition<TInput = unknown, TResult = unknown> {
  name: string;
  feature: string;
  action: string;
  permissions?: true;
  execute: (
    input: TInput,
    ctx: import('../../auth-rbac-user-management-layer/shared/execution-context').ExecutionContext,
  ) => Promise<TResult>;
}

export function defineCommandFeature<TInput, TResult>(
  def: CommandFeatureDefinition<TInput, TResult>,
) {
  return def;
}
