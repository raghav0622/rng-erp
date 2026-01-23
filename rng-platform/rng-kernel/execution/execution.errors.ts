// Execution & Feature Error Types

export interface FeatureExecutionError {
  type: 'FEATURE_EXECUTION_ERROR';
  feature: string;
  action: string;
  cause: unknown;
}
