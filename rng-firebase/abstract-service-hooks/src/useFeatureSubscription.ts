import type { FeatureHookResult } from './types';

export function useFeatureSubscription<T>(feature: string, query: string): FeatureHookResult<T> {
  throw new Error('useFeatureSubscription must be implemented by the application.');
}
