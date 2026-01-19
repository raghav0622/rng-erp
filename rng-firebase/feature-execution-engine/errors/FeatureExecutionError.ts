// FeatureExecutionError — all feature-thrown errors must be wrapped in this error
export class FeatureExecutionError extends Error {
  readonly code = 'FEATURE_EXECUTION_ERROR';
  constructor(message: string, readonly feature: string, readonly action: string) {
    super(message);
  }
}
