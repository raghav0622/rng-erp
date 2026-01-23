// FeatureExecutionEngine: Pure kernel feature execution
import type { ExecutionContext } from './execution.contract';
import type { FeatureExecutionError } from './execution.errors';

export type KernelFeature<TInput, TResult> = {
  readonly feature: string;
  readonly action: string;
  readonly execute: (ctx: ExecutionContext, input: TInput) => Promise<TResult>;
};

export async function executeKernelFeature<TInput, TResult>(
  feature: KernelFeature<TInput, TResult>,
  ctx: ExecutionContext,
  input: TInput,
  featureName: string,
  actionName: string,
): Promise<TResult> {
  // Enforce identity alignment
  if (feature.feature !== featureName || feature.action !== actionName) {
    const err: import('../errors/kernel.errors').KernelInvariantViolationError = {
      type: 'KERNEL_INVARIANT_VIOLATION',
      invariant: 'FEATURE_IDENTITY_ALIGNMENT',
      explanation: `Feature/action mismatch: feature.feature=${feature.feature}, featureName=${featureName}; feature.action=${feature.action}, actionName=${actionName}`,
    };
    throw err;
  }
  const FEATURE_TIMEOUT_MS = 10000; // 10 seconds default
  try {
    const result = await Promise.race([
      feature.execute(ctx, input),
      new Promise<TResult>((_, reject) =>
        setTimeout(
          () =>
            reject({
              type: 'FEATURE_EXECUTION_ERROR',
              feature: feature.feature,
              action: feature.action,
              cause: 'Feature execution timed out',
            }),
          FEATURE_TIMEOUT_MS,
        ),
      ),
    ]);
    return result;
  } catch (cause) {
    const err: FeatureExecutionError = {
      type: 'FEATURE_EXECUTION_ERROR',
      feature: feature.feature,
      action: feature.action,
      cause,
    };
    throw err;
  }
}
