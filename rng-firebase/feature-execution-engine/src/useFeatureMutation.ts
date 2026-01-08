import type { FeatureMutationResult } from './types';

export function useFeatureMutation<T>(feature: string): FeatureMutationResult<T> {
  throw new Error('useFeatureMutation must be implemented by the application.');
}
