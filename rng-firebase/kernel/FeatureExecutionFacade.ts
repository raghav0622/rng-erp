// FeatureExecutionFacade.ts
// Thin, promise-based wrapper around KernelExecutor for Suspense-ready usage (no React import)
import type { CommandFeature } from '../feature-execution-engine/contracts/feature';

export interface IKernelExecutor {
  execute<TInput, TResult>(
    feature: CommandFeature<TInput, TResult>,
    userId: string,
    input: TInput,
  ): Promise<TResult>;
}

export class FeatureExecutionFacade {
  constructor(private readonly executor: IKernelExecutor) {}

  /**
   * Suspense-ready promise-based feature execution.
   * Throws deterministic errors, never returns them.
   * No side effects during call.
   */
  execute<TInput, TResult>(
    feature: CommandFeature<TInput, TResult>,
    userId: string,
    input: TInput,
  ): Promise<TResult> {
    // No side effects, stable promise semantics
    return this.executor.execute(feature, userId, input);
  }
}
