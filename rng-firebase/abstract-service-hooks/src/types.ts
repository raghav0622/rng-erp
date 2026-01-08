export interface FeatureHookResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

export interface FeatureMutationResult<T> {
  mutate: (input: T) => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}
